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
} as const;
