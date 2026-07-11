import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { OrganizationMigrator, MigrationFile } from './migrator.js';
import { normalizeSlug } from './slugUtils.js';
import { seedPaymentMethods } from './defaultPayments.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIGRATION_ORDER } from '../../supabase/org-migrations/migration-order.js';
import { createOrgAdminClient } from './orgAdminClient.js';

dotenv.config();

/**
 * Input payload for provisioning a new organization.
 */
export interface ProvisionOrganizationInput {
  // Usuario admin
  email: string;
  password: string;
  fullName: string;
  
  // Organización
  organizationName: string;
  organizationSlug: string;
  
  // Base de datos
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  
  // Opciones
  skipMigrations?: boolean;
}

/**
 * Result of provisioning operation.
 */
export interface ProvisionResult {
  success: boolean;
  organizationId?: string;
  organizationSlug?: string;
  registryId?: string;
  adminUserId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Handles complete organization provisioning including migrations,
 * registry registration, org creation, admin user, and payment methods.
 */
export class OrganizationProvisioner {
  private registryClient: SupabaseClient;
  private migrationDir = 'supabase/org-migrations';

  constructor() {
    const registryUrl = process.env.VITE_REGISTRY_SUPABASE_URL;
    const registryServiceKey = process.env.REGISTRY_SERVICE_ROLE_KEY;
    
    if (!registryUrl || !registryServiceKey) {
      throw new Error(
        'Registry credentials required: VITE_REGISTRY_SUPABASE_URL and REGISTRY_SERVICE_ROLE_KEY'
      );
    }
    
    this.registryClient = createClient(registryUrl, registryServiceKey);
  }

  /**
   * Validates that the organization slug is unique in the registry.
   */
  private async validateSlugUnique(slug: string): Promise<void> {
    const { data, error } = await this.registryClient
      .from('organization_registry')
      .select('organization_slug')
      .eq('organization_slug', slug)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check slug uniqueness: ${error.message}`);
    }

    if (data) {
      const err = new Error(`Organization slug "${slug}" already exists in registry`);
      (err as any).code = '23505';
      throw err;
    }
  }

  /**
   * Creates the exec_sql function if it doesn't exist.
   */
  private async ensureExecSqlExists(orgClient: SupabaseClient): Promise<void> {
    const createExecSqlSQL = `
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
    `;

    const { error } = await orgClient.rpc('exec_sql', { sql: createExecSqlSQL });
    
    // If exec_sql doesn't exist, we can't create it this way
    // The user must create it manually first
    if (error) {
      throw new Error(
        `exec_sql function must be created manually before provisioning.\n\n` +
        `Run this SQL in the Supabase SQL Editor:\n\n` +
        createExecSqlSQL
      );
    }
  }

  /**
   * Loads migration files using the explicit order in migration-order.ts.
   */
  private loadMigrationFiles(): MigrationFile[] {
    return MIGRATION_ORDER.map((name) => ({
      name,
      content: readFileSync(join(this.migrationDir, `${name}.sql`), 'utf-8'),
      path: join(this.migrationDir, `${name}.sql`),
    }));
  }

  /**
   * Applies all migrations to the organization database.
   */
  private async applyMigrations(orgClient: SupabaseClient, organizationSlug: string): Promise<void> {
    console.log('Applying migrations...');
    
    const migrations = this.loadMigrationFiles();
    console.log(`Loaded ${migrations.length} migration files`);

    for (const migration of migrations) {
      console.log(`Applying migration: ${migration.name}`);
      
      try {
        const { error } = await orgClient.rpc('exec_sql', { sql: migration.content });
        
        if (error) {
          throw new Error(`Migration ${migration.name} failed: ${error.message}`);
        }
        
        console.log(`Applied migration: ${migration.name}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to apply migration ${migration.name}: ${errorMsg}`);
      }
    }
  }

  /**
   * Drops the exec_sql function after migrations are complete.
   */
  private async dropExecSql(orgClient: SupabaseClient): Promise<void> {
    console.log('Dropping exec_sql function...');
    
    // We need to use exec_sql itself to drop exec_sql
    const dropSQL = 'DROP FUNCTION IF EXISTS public.exec_sql(text);';
    
    try {
      const { error } = await orgClient.rpc('exec_sql', { sql: dropSQL });
      if (error) {
        console.warn(`Warning: Could not drop exec_sql: ${error.message}`);
      } else {
        console.log('Dropped exec_sql function');
      }
    } catch (error) {
      console.warn(`Warning: Could not drop exec_sql:`, error);
    }
  }

  /**
   * Registers the organization in the registry.
   */
  private async registerInRegistry(input: ProvisionOrganizationInput): Promise<string> {
    console.log('Registering organization in registry...');
    
    const { data, error } = await this.registryClient
      .from('organization_registry')
      .insert({
        organization_slug: input.organizationSlug,
        supabase_url: input.supabaseUrl,
        supabase_anon_key: input.supabaseAnonKey,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to register in registry: ${error.message}`);
    }

    console.log(`Registered in registry with ID: ${data.id}`);
    return data.id;
  }

  /**
   * Creates the organization row in the org database.
   */
  private async createOrganization(
    orgClient: SupabaseClient,
    input: ProvisionOrganizationInput
  ): Promise<string> {
    console.log('Creating organization...');
    
    const { data, error } = await orgClient
      .from('organizations')
      .insert({
        name: input.organizationName,
        slug: input.organizationSlug,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    console.log(`Created organization with ID: ${data.id}`);
    return data.id;
  }

  /**
   * Checks if a user already exists in profiles.
   */
  private async checkExistingUser(orgClient: SupabaseClient, email: string): Promise<string | null> {
    console.log('Checking if user already exists...');
    
    const { data, error } = await orgClient
      .from('profiles')
      .select('id')
      .eq('username', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check existing user: ${error.message}`);
    }

    if (data) {
      console.log(`User already exists with ID: ${data.id}`);
      return data.id;
    }

    return null;
  }

  /**
   * Creates a new auth user with email auto-confirmed (service_role admin API).
   */
  private async createAuthUser(
    orgClient: SupabaseClient,
    input: ProvisionOrganizationInput
  ): Promise<string> {
    console.log('Creating auth user...');
    
    const { data, error } = await orgClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
    });

    if (error) {
      throw new Error(`Failed to create auth user: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('User creation returned no user data');
    }

    console.log(`Created auth user with ID: ${data.user.id}`);
    return data.user.id;
  }

  /**
   * Creates an admin membership for the user.
   */
  private async createMembership(
    orgClient: SupabaseClient,
    userId: string,
    organizationId: string
  ): Promise<void> {
    console.log('Creating admin membership...');
    
    const { error } = await orgClient
      .from('organization_memberships')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: 'admin',
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to create membership: ${error.message}`);
    }

    console.log('Created admin membership');
  }

  /**
   * Main provisioning flow.
   */
  async provision(input: ProvisionOrganizationInput): Promise<ProvisionResult> {
    console.log('\nStarting organization provisioning...');
    console.log(`Organization: ${input.organizationName} (${input.organizationSlug})`);
    console.log(`Admin: ${input.fullName} (${input.email})`);
    console.log(`Mode: ${input.skipMigrations ? 'Existing project (skip migrations)' : 'New project (full setup)'}`);

    try {
      // 1. Normalize and validate slug
      const normalizedSlug = normalizeSlug(input.organizationSlug);
      input.organizationSlug = normalizedSlug;
      
      console.log(`\nStep 1: Validating slug "${normalizedSlug}"...`);
      await this.validateSlugUnique(normalizedSlug);
      console.log('Slug is unique');

      // 2. Create org client
      console.log('\nStep 2: Connecting to organization database...');
      const orgClient = createOrgAdminClient(input.supabaseUrl, input.supabaseServiceKey);
      console.log('Connected');

      // 3. Apply migrations if needed
      if (!input.skipMigrations) {
        console.log('\nStep 3: Setting up database schema...');
        await this.ensureExecSqlExists(orgClient);
        await this.applyMigrations(orgClient, input.organizationSlug);
        console.log('Database schema ready');
      } else {
        console.log('\nStep 3: Skipping migrations (existing project)');
      }

      // 4. Register in registry
      console.log('\nStep 4: Registering in organization registry...');
      const registryId = await this.registerInRegistry(input);

      // 5. Create organization
      console.log('\nStep 5: Creating organization record...');
      const organizationId = await this.createOrganization(orgClient, input);

      // 6. Check for existing user or create new one
      console.log('\nStep 6: Setting up admin user...');
      let userId = await this.checkExistingUser(orgClient, input.email);
      
      if (!userId) {
        userId = await this.createAuthUser(orgClient, input);
      }

      // 7. Create membership
      console.log('\nStep 7: Creating admin membership...');
      await this.createMembership(orgClient, userId, organizationId);

      // 8. Seed payment methods
      console.log('\nStep 8: Seeding payment methods...');
      await seedPaymentMethods(orgClient, organizationId);
      console.log('Payment methods seeded');

      // 9. Drop exec_sql if we created it
      if (!input.skipMigrations) {
        console.log('\nStep 9: Cleaning up...');
        await this.dropExecSql(orgClient);
      }

      console.log('\nOrganization provisioning completed successfully!');
      console.log(`\nSummary:`);
      console.log(`   Organization ID: ${organizationId}`);
      console.log(`   Registry ID: ${registryId}`);
      console.log(`   Admin User ID: ${userId}`);
      console.log(`   Slug: ${input.organizationSlug}`);

      return {
        success: true,
        organizationId,
        organizationSlug: input.organizationSlug,
        registryId,
        adminUserId: userId,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any).code;
      
      console.error('\nProvisioning failed:', errorMsg);
      
      return {
        success: false,
        error: errorMsg,
        errorCode,
      };
    }
  }
}
