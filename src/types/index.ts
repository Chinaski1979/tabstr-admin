/**
 * Domain types for the Tabstr admin console.
 *
 * These map the registry database (snake_case) into camelCase domain objects.
 * Mapping happens in services — hooks and components only ever see these types.
 */

/** Two admin tiers. `full_access` can see contracted/collected KPI totals on /revenue. */
export type AdminRole = "standard" | "full_access";

export interface AdminUser {
  id: string; // = auth.users.id
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
}

/** A row in organization_registry — one per organization registered to Tabstr. */
export interface OrganizationRegistry {
  id: string;
  organizationSlug: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isActive: boolean;
  /** Soft restriction: login allowed; POS may gate features. Weaker than !isActive. */
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Roles allowed on organization_memberships in tenant databases. */
export type OrgMembershipRole = 'admin' | 'manager' | 'cashier' | 'accountant';

export const ORG_MEMBERSHIP_ROLE_OPTIONS = [
  { value: 'admin' as const, label: 'Admin' },
  { value: 'manager' as const, label: 'Manager' },
  { value: 'cashier' as const, label: 'Cashier' },
  { value: 'accountant' as const, label: 'Accountant' },
];

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: OrgMembershipRole;
  isActive: boolean;
  joinedAt: Date;
}

export type CreateOrgUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: OrgMembershipRole;
};

export interface CreateOrgUserResult {
  userId: string;
  membershipId: string;
  reusedExistingUser: boolean;
}

export type UpdateOrgUserInput = {
  fullName: string;
  role: OrgMembershipRole;
  isActive: boolean;
};

/** A global feature flag definition (feature_flags table). */
export interface FeatureFlag {
  id: string;
  featureName: string;
  /** Short explanation of what the flag controls. */
  description: string | null;
  /** Global master switch — when false the feature is off for everyone. */
  isEnabled: boolean;
  isPaid: boolean;
  planName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFeatureFlagInput = {
  /** camelCase identifier used in tabstr code (e.g. digitalInvoices). */
  featureName: string;
  description?: string | null;
  isEnabled?: boolean;
  isPaid?: boolean;
  planName?: string | null;
};

export type UpdateFeatureFlagInput = {
  description?: string | null;
  isPaid?: boolean;
  planName?: string | null;
};

/**
 * A feature flag combined with whether it is active for a specific organization
 * (organization_features.active). `effectivelyEnabled` = global isEnabled && org active.
 */
export interface OrganizationFeature {
  flag: FeatureFlag;
  /** organization_features row id, when a row exists for this org+flag. */
  organizationFeatureId: string | null;
  /** Per-org toggle (organization_features.active). */
  active: boolean;
  effectivelyEnabled: boolean;
}

/** Must match registry `billing_interval` enum values. */
export const BILLING_INTERVAL_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "month", label: "Monthly" },
  { value: "bi-monthly", label: "Bi-monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-annually" },
  { value: "year", label: "Yearly" },
] as const;

export type BillingInterval = (typeof BILLING_INTERVAL_OPTIONS)[number]["value"];

export function billingIntervalLabel(value: string): string {
  return BILLING_INTERVAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export interface SubscriptionPlanPrice {
  id: string;
  billingInterval: BillingInterval;
  planPrice: number;
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  planName: string;
  features: string[];
  prices: SubscriptionPlanPrice[];
}

export type CreateSubscriptionPlanInput = {
  planName: string;
  prices: { billingInterval: BillingInterval; planPrice: number }[];
  features?: string[];
  isActive?: boolean;
};

export type UpdateSubscriptionPlanInput = {
  planName: string;
  prices: { id?: string; billingInterval: BillingInterval; planPrice: number }[];
  features?: string[];
  isActive?: boolean;
};

export interface OrganizationSpecialPlan {
  id: string;
  organizationRegistryId: string;
  specialPlanName: string;
  specialPrice: number;
  isActive: boolean;
  features: string[];
}

export type CreateOrganizationSpecialPlanInput = {
  specialPlanName: string;
  specialPrice: number;
  features?: string[];
  isActive?: boolean;
};

export type UpdateOrganizationSpecialPlanInput = {
  specialPlanName: string;
  specialPrice: number;
  features?: string[];
  isActive?: boolean;
};

export interface Subscription {
  id: string;
  organizationRegistryId: string;
  planId: string | null;
  specialPlanId: string | null;
  powertranzSubscriptionId: string;
  status: string; // active | past_due | cancelled | ...
  startDate: string | null;
  endDate: string | null;
  frequency: string | null;
  nextExecutionDate: string | null;
  planName: string | null;
  createdAt: Date;
}

export type InvoicePaymentMethod = "card" | "transfer";

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string | null;
  organizationRegistryId: string | null;
  amount: number;
  currency: string | null;
  status: string; // paid | failed | pending
  paymentMethod: InvoicePaymentMethod;
  recordedBy: string | null;
  powertranzTransactionId: string | null;
  processedAt: string | null;
  createdAt: Date;
}

export type CreateManualPaymentInput = {
  organizationRegistryId: string;
  paidOn: string; // YYYY-MM-DD
  paymentMethod: InvoicePaymentMethod;
};

/** Costa Rica IVA applied on top of special_price when charging a card. */
export const IVA_RATE = 0.13;

export type RevenuePeriod = "monthly" | "yearly";

/** An active special plan contributing to contracted (ex-IVA) revenue. */
export interface ContractedRevenuePlan {
  organizationRegistryId: string;
  organizationSlug: string;
  specialPlanName: string;
  specialPrice: number;
  startedAt: Date;
  hasPaidInvoice: boolean;
}

/** A registry invoice joined with its organization, for collected history. */
export interface CollectedRevenueInvoice {
  id: string;
  organizationRegistryId: string | null;
  organizationSlug: string | null;
  amount: number;
  currency: string | null;
  status: string;
  paymentMethod: InvoicePaymentMethod;
  recordedBy: string | null;
  processedAt: string | null;
  createdAt: Date;
}

export interface CollectedRevenueMonth {
  /** UTC calendar month, `YYYY-MM`. */
  month: string;
  paidTotal: number;
  paidCount: number;
  failedTotal: number;
  failedCount: number;
}

/**
 * Revenue overview for /revenue.
 * Contracted figures are net of IVA (special_price). Collected figures are cash
 * from subscription_invoices and already include IVA when the card was charged.
 */
export interface RevenueOverview {
  contractedNet: number;
  contractedGross: number;
  yearlyNetProjection: number;
  yearlyGrossProjection: number;
  contributingPlanCount: number;
  unbilledPlanCount: number;
  collectedThisMonth: number;
  collectedThisYear: number;
  failedThisMonth: number;
  failedThisYear: number;
  plans: ContractedRevenuePlan[];
  byMonth: CollectedRevenueMonth[];
  invoices: CollectedRevenueInvoice[];
}

// Organization provisioning types

/**
 * Input payload for provisioning a new organization.
 * Used by scripts/provision-org.ts to create a complete organization setup.
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
 * Returned by OrganizationProvisioner.provision().
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
 * Result of migrating a single organization.
 * Used in migration reports.
 */
export interface MigrationResult {
  organizationSlug: string;
  success: boolean;
  appliedMigrations: string[];
  errors: string[];
  duration: number;
}
/** A platform broadcast message shown in the POS header (platform_messages table). */
export interface PlatformMessage {
  id: string;
  /** null = global (all organizations) */
  organizationRegistryId: string | null;
  messageText: string;
  expiresAt: Date;
  isActive: boolean;
  isUrgent: boolean;
  isDismissible: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatePlatformMessageInput = {
  messageText: string;
  expiresAt: Date;
  isActive?: boolean;
  isUrgent?: boolean;
  isDismissible?: boolean;
  /** Omit or null for global messages */
  organizationRegistryId?: string | null;
};

export type UpdatePlatformMessageInput = {
  messageText: string;
  expiresAt: Date;
  isActive: boolean;
  isUrgent: boolean;
  isDismissible: boolean;
};

// Recursive organization delete (danger zone)

/**
 * Pre-deletion row count for one tenant table.
 * `count: -1` means "not counted" (skipped table or failed count query).
 */
export interface TableCount {
  table: string;
  count: number;
  /** Table has no `organization_id` column — cleaned up by SQL in Phase 1 instead. */
  skipped: boolean;
}

/** A member of the org, plus whether they also belong to other organizations. */
export interface OrgDeleteOrgUser {
  userId: string;
  inOtherOrgs: boolean;
}

/**
 * Whether the browser admin session may delete a registry table directly.
 * `allowed` = RLS + grants permit it; `pending-server-side` = manual/server-side cleanup.
 */
export type RegistryTableDisposition = "allowed" | "pending-server-side";

/** Phase 3 (registry) table descriptor. */
export interface RegistryTableDescriptor {
  table: string;
  /** Column matched against the org: FK to organization_registry (or organization_slug). */
  fkColumn: string | null;
  disposition: RegistryTableDisposition;
}

export type RegistryCleanupStatus = "deleted" | "pending-server-side" | "skipped" | "failed";

export interface RegistryCleanupResult extends RegistryTableDescriptor {
  status: RegistryCleanupStatus;
  /** Rows removed — null when not attempted. */
  rowCount: number | null;
  reason?: string;
  /** Manual SQL for tables the browser cannot delete (requires the Node-side service role key). */
  manualSql?: string;
  error?: string;
  errorCode?: string;
}

/** One SQL statement run through `exec_sql`, with its outcome. */
export interface ExecutedSqlStatement {
  sql: string;
  ok: boolean;
  error?: string;
}

/**
 * Read-only preview of a deletion: counts, generated SQL and registry plan.
 * Built from counts + selects only — never mutates data.
 */
export interface DryRunPlan {
  slug: string;
  orgRegistryId: string;
  orgId: string;
  projectId: string;
  execSqlPresent: boolean;
  counts: TableCount[];
  orgUserIds: string[];
  orgUsers: OrgDeleteOrgUser[];
  sqlStatements: string[];
  registryPlan: RegistryTableDescriptor[];
  errors: string[];
}

/**
 * Persistent record of a delete attempt (localStorage key `tabstr-org-delete-audit`).
 * ALWAYS produced by `executeOrgDelete` — including aborted/partial runs.
 */
export interface AuditReport {
  id: string;
  slug: string;
  orgRegistryId: string;
  orgId: string;
  projectId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** Stopped before Phase 1/2 (missing exec_sql, missing org row, …). */
  aborted: boolean;
  abortReason: string | null;
  /** Completed without errors or failed registry rows. Pending rows are reported separately. */
  success: boolean;
  /**
   * True only when the Phase 2 `DELETE FROM organizations` succeeded (Phase 3
   * then ran). `false` means the organization row is STILL present — nothing
   * was deleted. Optional because reports persisted before this field existed
   * do not carry it (`undefined` = unknown, keep the generic wording).
   */
  phase2DeleteOk?: boolean;
  execSqlPresent: boolean;
  counts: TableCount[];
  orgUsers: OrgDeleteOrgUser[];
  /** Phase 1 + Phase 2 statements run through exec_sql, in order. */
  executedSql: ExecutedSqlStatement[];
  /** True when every trigger disabled in Phase 2 was re-enabled in `finally`. */
  triggersReenabled: boolean;
  triggerErrors: string[];
  registryCleanup: RegistryCleanupResult[];
  errors: string[];
}

/** Local (sync) deletion capability: shared project + service key present and valid. */
export interface OrgDeleteCapability {
  enabled: boolean;
  /** Why deletion is disabled (English, shown as the button tooltip). */
  reason?: string;
  projectId?: string;
  envVar?: string;
}

/** Capability plus a live probe against the org's project DB. */
export interface OrgDeleteCapabilityProbe extends OrgDeleteCapability {
  liveProbe: "ok" | "failed" | "skipped";
  probeError?: string;
}
