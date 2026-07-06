import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { MIGRATION_ORDER } from '../../supabase/org-migrations/migration-order.js';

// Load environment variables
dotenv.config();

/**
 * Represents an organization registered in the registry.
 */
export interface OrganizationRegistry {
  id: string;
  organization_slug: string;
  supabase_: string;
  supabase_anon_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a migration SQL file.
 */
export interface MigrationFile {
  name: string;
  content: string;
  path: string;
}

/**
 * Result of migrating a single organization.
 */
export interface MigrationResult {
  organizationSlug: string;
  success: boolean;
  appliedMigrations: string[];
  errors: string[];
  duration: number;
}

/**
 * Complete migration report for all organizations.
 */
export interface MigrationReport {
  timestamp: string;
  totalOrganizations: number;
  successfulOrganizations: number;
  failedOrganizations: number;
  totalMigrationsApplied: number;
  totalDuration: number;
  results: MigrationResult[];
}

/**
 * Main migrator class that handles database migrations for all organizations.
 * Port of SimpleSupabaseMigrator from Tabstr POS.
 */
export class OrganizationMigrator {
  private registryClient: SupabaseClient;
  private migrationFiles: MigrationFile[] = [];
  private results: MigrationResult[] = [];
  private migrationDir = 'supabase/org-migrations';

  constructor() {
    const registryUrl = process.env.VITE_REGISTRY_SUPABASE_URL;
    const registryServiceKey = process.env.REGISTRY_SERVICE_ROLE_KEY;
    
    if (!registryUrl || !registryServiceKey) {
      throw new Error(
        'Registry credentials are required: VITE_REGISTRY_SUPABASE_URL and REGISTRY_SERVICE_ROLE_KEY'
      );
    }
    
    this.registryClient = createClient(registryUrl, registryServiceKey);
    this.loadMigrationFiles();
  }

  /**
   * Loads all migration SQL files using the explicit order in migration-order.ts.
   */
  private loadMigrationFiles(): void {
    this.migrationFiles = MIGRATION_ORDER.map((name) => {
      const path = join(this.migrationDir, `${name}.sql`);
      return {
        name,
        content: readFileSync(path, 'utf-8'),
        path,
      };
    });
    
    console.log(`Loaded ${this.migrationFiles.length} migration files`);
  }

  /**
   * Fetches all active organizations from the registry.
   */
  async getAllOrganizations(): Promise<OrganizationRegistry[]> {
    const { data, error } = await this.registryClient
      .from('organization_registry')
      .select('*')
      .eq('is_active', true)
      .order('organization_slug');

    if (error) {
      throw new Error(`Failed to fetch organizations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Gets the service key for a specific organization from environment variables.
   * Expected format: SERVICE_KEY_<SLUG_UPPERCASE>
   */
  private getServiceKey(organizationSlug: string): string {
    const envKey = `SERVICE_KEY_${organizationSlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const serviceKey = process.env[envKey];
    
    if (!serviceKey) {
      throw new Error(
        `Service key not found for organization ${organizationSlug}. Expected env var: ${envKey}`
      );
    }
    
    return serviceKey;
  }

  /**
   * Creates the migration_history table if it doesn't exist.
   */
  async createMigrationTable(supabaseUrl: string, serviceKey: string): Promise<void> {
    const client = createClient(supabaseUrl, serviceKey);
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migration_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        organization_slug VARCHAR(100)
      );
    `;
    
    const { error } = await client.rpc('exec_sql', { sql: createTableSQL });
    if (error) {
      throw new Error(`Failed to create migration table: ${error.message}`);
    }
  }

  /**
   * Gets the list of already applied migrations for an organization.
   */
  async getAppliedMigrations(supabaseUrl: string, serviceKey: string): Promise<string[]> {
    const client = createClient(supabaseUrl, serviceKey);
    
    try {
      const { data, error } = await client
        .from('migration_history')
        .select('migration_name')
        .order('applied_at');
      
      if (error) {
        console.warn(`Warning: Could not fetch migration history: ${error.message}`);
        return [];
      }
      
      return data?.map(row => row.migration_name) || [];
    } catch (error) {
      console.warn(`Warning: Could not fetch migration history: ${error}`);
      return [];
    }
  }

  /**
   * Applies a single migration to an organization's database.
   */
  async applyMigration(
    supabaseUrl: string,
    serviceKey: string,
    migration: MigrationFile,
    organizationSlug: string,
    dryRun: boolean = false
  ): Promise<boolean> {
    const client = createClient(supabaseUrl, serviceKey);
    
    try {
      if (dryRun) {
        console.log(`[DRY RUN] Would apply migration: ${migration.name}`);
        return true;
      }

      console.log(`Applying migration: ${migration.name}`);

      // Apply the migration using exec_sql function
      const { error: migrationError } = await client.rpc('exec_sql', {
        sql: migration.content,
      });
      
      if (migrationError) {
        // Check if it's the exec_sql not found error
        if (migrationError.message?.includes('exec_sql') || 
            migrationError.message?.includes('function') ||
            migrationError.code === '42883') {
          throw new Error(
            `exec_sql function not found. Please create it first:\n\n` +
            `CREATE OR REPLACE FUNCTION public.exec_sql(sql text)\n` +
            `RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$\n` +
            `BEGIN EXECUTE sql; END; $$;\n` +
            `GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;\n\n` +
            `Original error: ${migrationError.message}`
          );
        }
        throw new Error(`Migration failed: ${migrationError.message}`);
      }

      // Record the migration
      const { error: recordError } = await client
        .from('migration_history')
        .insert({
          migration_name: migration.name,
          organization_slug: organizationSlug,
        });

      if (recordError) {
        console.warn(`Warning: Could not record migration: ${recordError.message}`);
      }

      console.log(`Successfully applied migration: ${migration.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to apply migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Migrates a single organization.
   */
  async migrateOrganization(
    organization: OrganizationRegistry,
    dryRun: boolean = false
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      organizationSlug: organization.organization_slug,
      success: true,
      appliedMigrations: [],
      errors: [],
      duration: 0,
    };

    try {
      console.log(`\nMigrating organization: ${organization.organization_slug}`);
      
      // Get service key from .env
      const serviceKey = this.getServiceKey(organization.organization_slug);
      
      // Create migration table if it doesn't exist
      await this.createMigrationTable(organization.supabase_url, serviceKey);
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations(
        organization.supabase_url,
        serviceKey
      );
      
      console.log(`Applied migrations: ${appliedMigrations.length}`);

      const migrationsToApply = this.migrationFiles.filter(
        migration => !appliedMigrations.includes(migration.name)
      );
      
      console.log(`Migrations to apply: ${migrationsToApply.length}`);
      
      if (migrationsToApply.length === 0) {
        console.log(`No migrations to apply for ${organization.organization_slug}`);
        result.duration = Date.now() - startTime;
        return result;
      }
      
      // Apply migrations
      for (const migration of migrationsToApply) {
        try {
          await this.applyMigration(
            organization.supabase_url,
            serviceKey,
            migration,
            organization.organization_slug,
            dryRun
          );
          result.appliedMigrations.push(migration.name);
        } catch (error) {
          result.success = false;
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to apply migration ${migration.name}: ${errorMsg}`);
          // Stop on first error
          break;
        }
      }
      
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Organization migration failed: ${errorMsg}`);
      console.error(`Error migrating ${organization.organization_slug}:`, error);
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Runs migrations on specified organizations or all active organizations.
   */
  async runMigrations(
    targetOrganizations: string[] = [],
    dryRun: boolean = false
  ): Promise<void> {
    console.log('Starting database migrations...');
    console.log(`Target organizations: ${targetOrganizations.length > 0 ? targetOrganizations.join(', ') : 'ALL'}`);
    console.log(`Dry run mode: ${dryRun ? 'YES' : 'NO'}`);
    
    // Get all organizations
    const allOrganizations = await this.getAllOrganizations();
    console.log(`Found ${allOrganizations.length} active organizations`);
    
    // Filter organizations
    const organizationsToMigrate = targetOrganizations.length > 0
      ? allOrganizations.filter(org => targetOrganizations.includes(org.organization_slug))
      : allOrganizations;
    
    if (organizationsToMigrate.length === 0) {
      console.log('No organizations found to migrate');
      return;
    }
    
    console.log(`Migrating ${organizationsToMigrate.length} organizations`);
    
    // Migrate each organization
    for (const organization of organizationsToMigrate) {
      const result = await this.migrateOrganization(organization, dryRun);
      this.results.push(result);
    }
    
    // Generate report
    this.generateReport();
  }

  /**
   * Generates and saves a migration report.
   */
  private generateReport(): void {
    const reportDir = 'migration-reports';
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportDir, `migration-report-${timestamp}.json`);
    
    const report: MigrationReport = {
      timestamp: new Date().toISOString(),
      totalOrganizations: this.results.length,
      successfulOrganizations: this.results.filter(r => r.success).length,
      failedOrganizations: this.results.filter(r => !r.success).length,
      totalMigrationsApplied: this.results.reduce((sum, r) => sum + r.appliedMigrations.length, 0),
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      results: this.results,
    };
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Console summary
    console.log('\nMIGRATION SUMMARY');
    console.log('==================');
    console.log(`Total organizations: ${report.totalOrganizations}`);
    console.log(`Successful: ${report.successfulOrganizations}`);
    console.log(`Failed: ${report.failedOrganizations}`);
    console.log(`Total migrations applied: ${report.totalMigrationsApplied}`);
    console.log(`Total duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Report saved to: ${reportPath}`);
    
    // Detailed results
    console.log('\nDETAILED RESULTS');
    console.log('==================');
    this.results.forEach(result => {
      const status = result.success ? 'OK' : 'FAIL';
      console.log(
        `${status} ${result.organizationSlug}: ${result.appliedMigrations.length} migrations, ${result.duration}ms`
      );
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   ${error}`));
      }
    });
  }
}
