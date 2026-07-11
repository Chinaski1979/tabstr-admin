#!/usr/bin/env node
import { OrganizationProvisioner, ProvisionOrganizationInput } from './lib/orgProvisioner.js';
import { generateSlugFromName } from './lib/slugUtils.js';
import * as readline from 'readline';

/**
 * CLI script to provision a new organization.
 * 
 * Usage:
 *   npm run provision-org                            # Interactive mode
 *   npm run provision-org -- \
 *     --email admin@example.com \
 *     --password secret123 \
 *     --full-name "Admin User" \
 *     --org-name "Mi Restaurant" \
 *     --slug mi-restaurant \
 *     --supabase-url https://xxx.supabase.co \
 *     --anon-key eyJ... \
 *     --service-key eyJ... \
 *     --skip-migrations
 */

interface CLIArgs {
  email?: string;
  password?: string;
  fullName?: string;
  orgName?: string;
  slug?: string;
  supabaseUrl?: string;
  anonKey?: string;
  serviceKey?: string;
  skipMigrations?: boolean;
}

function parseArgs(args: string[]): CLIArgs {
  const parsed: CLIArgs = {};
  
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      parsed.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.split('=')[1];
    } else if (arg.startsWith('--full-name=')) {
      parsed.fullName = arg.split('=')[1];
    } else if (arg.startsWith('--org-name=')) {
      parsed.orgName = arg.split('=')[1];
    } else if (arg.startsWith('--slug=')) {
      parsed.slug = arg.split('=')[1];
    } else if (arg.startsWith('--supabase-url=')) {
      parsed.supabaseUrl = arg.split('=')[1];
    } else if (arg.startsWith('--anon-key=')) {
      parsed.anonKey = arg.split('=')[1];
    } else if (arg.startsWith('--service-key=')) {
      parsed.serviceKey = arg.split('=')[1];
    } else if (arg === '--skip-migrations') {
      parsed.skipMigrations = true;
    }
  }
  
  return parsed;
}

function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function interactiveMode(): Promise<ProvisionOrganizationInput> {
  const rl = createReadline();
  
  console.log('\nOrganization Provisioning - Interactive Mode\n');
  console.log('=================================================\n');
  
  // User info
  console.log('STEP 1: Admin User Information\n');
  const email = await question(rl, '  Email: ');
  const password = await question(rl, '  Password (min 6 characters): ');
  const fullName = await question(rl, '  Full Name: ');
  
  // Organization info
  console.log('\nSTEP 2: Organization Information\n');
  const organizationName = await question(rl, '  Organization Name: ');
  const suggestedSlug = generateSlugFromName(organizationName);
  const slugInput = await question(rl, `  Slug [${suggestedSlug}]: `);
  const organizationSlug = slugInput.trim() || suggestedSlug;
  
  // Database info
  console.log('\nSTEP 3: Supabase Database\n');
  const supabaseUrl = await question(rl, '  Supabase URL: ');
  const supabaseAnonKey = await question(rl, '  Anon Key: ');
  const supabaseServiceKey = await question(rl, '  Service Role Key (temp, not stored): ');
  
  const skipMigrationsInput = await question(rl, '\n  Skip migrations? (project already has schema) [y/N]: ');
  const skipMigrations = skipMigrationsInput.toLowerCase() === 'y';
  
  rl.close();
  
  return {
    email,
    password,
    fullName,
    organizationName,
    organizationSlug,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    skipMigrations,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);
  
  let input: ProvisionOrganizationInput;
  
  // Check if we have all required args for non-interactive mode
  const hasAllArgs = parsedArgs.email && 
                     parsedArgs.password && 
                     parsedArgs.fullName &&
                     parsedArgs.orgName && 
                     parsedArgs.supabaseUrl && 
                     parsedArgs.anonKey && 
                     parsedArgs.serviceKey;
  
  if (hasAllArgs) {
    // Non-interactive mode
    input = {
      email: parsedArgs.email!,
      password: parsedArgs.password!,
      fullName: parsedArgs.fullName!,
      organizationName: parsedArgs.orgName!,
      organizationSlug: parsedArgs.slug || generateSlugFromName(parsedArgs.orgName!),
      supabaseUrl: parsedArgs.supabaseUrl!,
      supabaseAnonKey: parsedArgs.anonKey!,
      supabaseServiceKey: parsedArgs.serviceKey!,
      skipMigrations: parsedArgs.skipMigrations || false,
    };
  } else {
    // Interactive mode
    input = await interactiveMode();
  }
  
  try {
    const provisioner = new OrganizationProvisioner();
    const result = await provisioner.provision(input);
    
    if (result.success) {
      console.log('\nSuccess! Organization provisioned.');
      process.exit(0);
    } else {
      console.error(`\nProvisioning failed: ${result.error}`);
      
      // Provide helpful hints for common errors
      if (result.errorCode === '23505') {
        console.error('\nHint: Choose a different slug. Examples:');
        console.error(`   - ${input.organizationSlug}-02`);
        console.error(`   - ${input.organizationSlug}-branch`);
      } else if (result.error?.includes('exec_sql')) {
        console.error('\nHint: Create the exec_sql function first.');
        console.error('   See scripts/templates/exec_sql.sql for the SQL to run.');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('Provisioning failed:', error);
    process.exit(1);
  }
}

main();
