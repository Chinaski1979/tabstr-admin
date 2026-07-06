/**
 * Embedded SQL migrations for organization database provisioning.
 * These migrations are imported as raw text and executed in order during provisioning.
 */

import migration00 from '@/../supabase/org-migrations/00_helper_function.sql?raw';
import migration01 from '@/../supabase/org-migrations/01_organizations.sql?raw';
import migration02 from '@/../supabase/org-migrations/02_profiles.sql?raw';
import migration03 from '@/../supabase/org-migrations/03_memberships.sql?raw';
import migration04 from '@/../supabase/org-migrations/04_providers.sql?raw';
import migration05 from '@/../supabase/org-migrations/05_products.sql?raw';
import migration06 from '@/../supabase/org-migrations/06_payment_methods.sql?raw';
import migration07 from '@/../supabase/org-migrations/07_tabs.sql?raw';
import migration08 from '@/../supabase/org-migrations/08_tab_items.sql?raw';
import migration09 from '@/../supabase/org-migrations/09_sales.sql?raw';
import migration10 from '@/../supabase/org-migrations/10_cash_balances.sql?raw';
import migration11 from '@/../supabase/org-migrations/11_cash_withdrawals.sql?raw';
import migration12 from '@/../supabase/org-migrations/12_organization_messages.sql?raw';
import migration13 from '@/../supabase/org-migrations/13_organization_tables.sql?raw';
import migration14a from '@/../supabase/org-migrations/14_accepted_orders_history.sql?raw';
import migration14b from '@/../supabase/org-migrations/14_organization_rooms.sql?raw';
import migration15a from '@/../supabase/org-migrations/15_clients.sql?raw';
import migration15b from '@/../supabase/org-migrations/15_product_categories.sql?raw';
import migration15c from '@/../supabase/org-migrations/15_product_categories_migration.sql?raw';
import migration16 from '@/../supabase/org-migrations/16_link_tab_items_to_categories.sql?raw';
import migration17 from '@/../supabase/org-migrations/17_organization_memberships_role_accountant.sql?raw';
import migration18 from '@/../supabase/org-migrations/18_table_tabs_bidirectional_sync.sql?raw';
import migration19 from '@/../supabase/org-migrations/19_tabs_table_id.sql?raw';
import migration20 from '@/../supabase/org-migrations/20_simple_users.sql?raw';
import migration21a from '@/../supabase/org-migrations/21_sales_sold_by_name.sql?raw';
import migration21b from '@/../supabase/org-migrations/21_sales_sold_by_simple_user.sql?raw';
import migration22 from '@/../supabase/org-migrations/22_simple_users_remove_sessions.sql?raw';
import migration23 from '@/../supabase/org-migrations/23_provider_orders.sql?raw';
import migration24 from '@/../supabase/org-migrations/24_clear_unresolvable_tab_server_names.sql?raw';

import { MIGRATION_ORDER } from '@/../supabase/org-migrations/migration-order';

export interface MigrationFile {
  name: string;
  content: string;
}

const MIGRATION_CONTENT_BY_NAME: Record<string, string> = {
  '00_helper_function': migration00,
  '01_organizations': migration01,
  '02_profiles': migration02,
  '03_memberships': migration03,
  '04_providers': migration04,
  '05_products': migration05,
  '06_payment_methods': migration06,
  '07_tabs': migration07,
  '08_tab_items': migration08,
  '09_sales': migration09,
  '10_cash_balances': migration10,
  '11_cash_withdrawals': migration11,
  '12_organization_messages': migration12,
  '13_organization_tables': migration13,
  '14_accepted_orders_history': migration14a,
  '14_organization_rooms': migration14b,
  '15_clients': migration15a,
  '15_product_categories': migration15b,
  '15_product_categories_migration': migration15c,
  '16_link_tab_items_to_categories': migration16,
  '17_organization_memberships_role_accountant': migration17,
  '18_table_tabs_bidirectional_sync': migration18,
  '19_tabs_table_id': migration19,
  '20_simple_users': migration20,
  '21_sales_sold_by_name': migration21a,
  '21_sales_sold_by_simple_user': migration21b,
  '22_simple_users_remove_sessions': migration22,
  '23_provider_orders': migration23,
  '24_clear_unresolvable_tab_server_names': migration24,
};

/**
 * Array of all migration files in execution order.
 * Order is defined in supabase/org-migrations/migration-order.ts (not alphabetical).
 */
export const MIGRATION_FILES: readonly MigrationFile[] = MIGRATION_ORDER.map((name) => {
  const content = MIGRATION_CONTENT_BY_NAME[name];
  if (!content) {
    throw new Error(`Missing migration content for: ${name}`);
  }
  return { name, content };
});
