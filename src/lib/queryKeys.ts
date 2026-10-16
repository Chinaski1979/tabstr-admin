/**
 * Centralized query keys for TanStack Query.
 * Always add a key here before using it so invalidation stays consistent.
 */
export const queryKeys = {
  // Current admin (auth user → admin_users row)
  adminProfile: (userId: string) => ["adminProfile", userId] as const,
  adminUsers: () => ["adminUsers"] as const,

  // Organizations (organization_registry)
  organizations: () => ["organizations"] as const,
  organization: (id: string) => ["organization", id] as const,

  // Global feature flags (feature_flags)
  featureFlags: () => ["featureFlags"] as const,
  /** Per-org feature toggles (organization_features join feature_flags) */
  organizationFeatures: (orgRegistryId: string) =>
    ["organizationFeatures", orgRegistryId] as const,

  // Subscriptions (registry)
  subscriptionPlans: () => ["subscriptionPlans"] as const,
  /** Latest/current subscription for an org */
  organizationSubscription: (orgRegistryId: string) =>
    ["organizationSubscription", orgRegistryId] as const,
  /** Invoice history for an org */
  organizationInvoices: (orgRegistryId: string) =>
    ["organizationInvoices", orgRegistryId] as const,
  organizationSpecialPlan: (orgRegistryId: string) =>
    ["organizationSpecialPlan", orgRegistryId] as const,
  /** Contracted special-plan MRR + collected invoice history */
  revenue: () => ["revenue"] as const,
  /** Prefix that matches every month-scoped invoice query */
  revenueInvoicesRoot: () => ["revenueInvoices"] as const,
  /** Invoice rows for one UTC calendar month (`YYYY-MM`) */
  revenueInvoices: (month: string) => ["revenueInvoices", month] as const,
  /** Founder scorecard: live health, monthly closes, MRR snapshots */
  business: () => ["business"] as const,
  /** Members in the tenant database for an org */
  organizationMembers: (orgRegistryId: string) =>
    ["organizationMembers", orgRegistryId] as const,
  // Platform broadcast messages (platform_messages)
  globalPlatformMessages: () => ["globalPlatformMessages"] as const,
  organizationPlatformMessages: (orgRegistryId: string) =>
    ["organizationPlatformMessages", orgRegistryId] as const,

  // Recursive organization delete (danger zone)
  /** Capability (shared project + service key + live probe) per org project + slug. */
  orgDeleteCapability: (supabaseUrl: string, organizationSlug: string) =>
    ["orgDeleteCapability", supabaseUrl, organizationSlug] as const,
  /** Dry-run plan per organization slug. */
  orgDeleteDryRun: (slug: string) => ["orgDeleteDryRun", slug] as const,
  /** Saved audit reports (localStorage) — prefix-invalidate with the root key. */
  orgDeleteAuditReportsRoot: () => ["orgDeleteAuditReports"] as const,
  orgDeleteAuditReports: (slug?: string) => ["orgDeleteAuditReports", slug ?? "all"] as const,
} as const;
