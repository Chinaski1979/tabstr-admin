import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRegistryClient } from '@/integrations/supabase/client';
import { normalizeSlug } from '@/lib/slugUtils';
import { seedPaymentMethods } from './defaultPayments';
import { MIGRATION_FILES } from './migrations';
import { findOrgUserIdByEmail } from './checkOrgUser';
import { createOrgAdminClient } from './orgAdminClient';
import { createOrgAuthUser, insertOrgMembership } from './orgUserOperations';
import type { ProvisionOrganizationInput, ProvisionResult } from '@/types';

/**
 * Validates that the organization slug is unique in the registry.
 */
async function validateSlugUnique(slug: string): Promise<void> {
  const registryClient = getRegistryClient();
  const { data, error } = await registryClient
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
 * Applies all migrations to the organization database.
 */
async function applyMigrations(orgClient: SupabaseClient): Promise<void> {
  console.log('Applying migrations...');
  console.log(`Loaded ${MIGRATION_FILES.length} migration files`);

  for (const migration of MIGRATION_FILES) {
    console.log(`Applying migration: ${migration.name}`);
    
    try {
      const { error } = await orgClient.rpc('exec_sql', { sql: migration.content });
      
      if (error) {
        // Check if it's the exec_sql not found error
        if (error.message?.includes('exec_sql') || 
            error.message?.includes('function') ||
            error.code === '42883') {
          throw new Error(
            `exec_sql function not found. Please create it first:\n\n` +
            `CREATE OR REPLACE FUNCTION public.exec_sql(sql text)\n` +
            `RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$\n` +
            `BEGIN EXECUTE sql; END; $$;\n` +
            `GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;\n\n` +
            `Original error: ${error.message}`
          );
        }
        throw new Error(`Migration ${migration.name} failed: ${error.message}`);
      }
      
      console.log(`Applied migration: ${migration.name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const err = new Error(`Failed to apply migration ${migration.name}: ${errorMsg}`);
      (err as Error & { cause: unknown }).cause = error;
      throw err;
    }
  }
}

/**
 * Registers the organization in the registry.
 */
async function registerInRegistry(
  input: ProvisionOrganizationInput,
  normalizedSlug: string
): Promise<string> {
  console.log('Registering organization in registry...');
  
  const registryClient = getRegistryClient();
  const { data, error } = await registryClient
    .from('organization_registry')
    .insert({
      organization_slug: normalizedSlug,
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
async function createOrganization(
  orgClient: SupabaseClient,
  input: ProvisionOrganizationInput,
  normalizedSlug: string
): Promise<string> {
  console.log('Creating organization...');
  
  const { data, error } = await orgClient
    .from('organizations')
    .insert({
      name: input.organizationName,
      slug: normalizedSlug,
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
async function checkExistingUser(
  orgClient: SupabaseClient,
  email: string
): Promise<string | null> {
  console.log('Checking if user already exists...');
  const userId = await findOrgUserIdByEmail(orgClient, email);
  if (userId) {
    console.log(`User already exists with ID: ${userId}`);
  }
  return userId;
}

/**
 * Main provisioning function for browser environment.
 * Creates a complete organization with database schema, admin user, and initial data.
 */
export async function provisionOrganization(
  input: ProvisionOrganizationInput
): Promise<ProvisionResult> {
  try {
    // 1. Normalize and validate slug
    const normalizedSlug = normalizeSlug(input.organizationSlug);
    
    console.log(`\nStep 1: Validating slug "${normalizedSlug}"...`);
    await validateSlugUnique(normalizedSlug);
    console.log('Slug is unique');

    // 2. Create org client with service_role (isolated from browser auth sessions)
    console.log('\nStep 2: Connecting to organization database...');
    const orgClient = createOrgAdminClient(input.supabaseUrl, input.supabaseServiceKey);
    console.log('Connected');

    // 3. Apply migrations if needed
    if (!input.skipMigrations) {
      console.log('\nStep 3: Setting up database schema...');
      await applyMigrations(orgClient);
      console.log('Database schema ready');
    } else {
      console.log('\nStep 3: Skipping migrations (existing project)');
    }

    // 4. Register in registry
    console.log('\nStep 4: Registering in organization registry...');
    const registryId = await registerInRegistry(input, normalizedSlug);

    // 5. Create organization
    console.log('\nStep 5: Creating organization record...');
    const organizationId = await createOrganization(orgClient, input, normalizedSlug);

    // 6. Check for existing user or create new one
    console.log('\nStep 6: Setting up admin user...');
    let userId = await checkExistingUser(orgClient, input.email);
    
    if (!userId) {
      console.log('Creating auth user...');
      userId = await createOrgAuthUser(orgClient, {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
      });
      console.log(`Created auth user with ID: ${userId}`);
    }

    // 7. Create membership
    console.log('\nStep 7: Creating admin membership...');
    await insertOrgMembership(orgClient, {
      userId,
      organizationId,
      role: 'admin',
    });
    console.log('Created admin membership');

    // 8. Seed payment methods
    console.log('\nStep 8: Seeding payment methods...');
    await seedPaymentMethods(orgClient, organizationId);
    console.log('Payment methods seeded');

    // 9. exec_sql permanece (no se elimina)
    console.log('\nStep 9: Keeping exec_sql for future migrations...');
    console.log('exec_sql function remains available');

    console.log('\nOrganization provisioning completed successfully!');
    console.log(`\nSummary:`);
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Registry ID: ${registryId}`);
    console.log(`   Admin User ID: ${userId}`);
    console.log(`   Slug: ${normalizedSlug}`);

    return {
      success: true,
      organizationId,
      organizationSlug: normalizedSlug,
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
