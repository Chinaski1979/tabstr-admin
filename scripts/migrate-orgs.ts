#!/usr/bin/env node
import { OrganizationMigrator } from './lib/migrator.js';

/**
 * CLI script to run migrations on organizations.
 * 
 * Usage:
 *   npm run migrate                                  # All active orgs
 *   npm run migrate -- --target-organizations=slug1,slug2
 *   npm run migrate -- --dry-run
 */

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const targetOrganizationsArg = args.find(arg => arg.startsWith('--target-organizations='));
  const targetOrganizations = targetOrganizationsArg
    ? targetOrganizationsArg.split('=')[1].split(',').filter(Boolean)
    : [];
  
  const dryRun = args.includes('--dry-run=true') || args.includes('--dry-run');
  
  try {
    const migrator = new OrganizationMigrator();
    await migrator.runMigrations(targetOrganizations, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
