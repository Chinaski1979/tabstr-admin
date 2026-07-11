/**
 * Explicit execution order for org DB migrations.
 * Do not rely on filename sorting — some migrations depend on tables created later in numeric order.
 */
export const MIGRATION_ORDER = [
  '00_helper_function',
  '01_organizations',
  '02_profiles',
  '03_memberships',
  '04_providers',
  '05_products',
  '06_payment_methods',
  '07_tabs',
  '08_tab_items',
  '09_sales',
  '10_cash_balances',
  '11_cash_withdrawals',
  '12_organization_messages',
  '13_organization_tables',
  '14_accepted_orders_history',
  '14_organization_rooms',
  '15_clients',
  '15_product_categories',
  '15_product_categories_migration',
  '16_link_tab_items_to_categories',
  '17_organization_memberships_role_accountant',
  '19_tabs_table_id', // adds tabs.table_id — must run before 18
  '18_table_tabs_bidirectional_sync',
  '20_simple_users',
  '21_sales_sold_by_name',
  '21_sales_sold_by_simple_user',
  '22_simple_users_remove_sessions',
  '23_provider_orders',
  '24_clear_unresolvable_tab_server_names',
] as const;

export type MigrationName = (typeof MIGRATION_ORDER)[number];
