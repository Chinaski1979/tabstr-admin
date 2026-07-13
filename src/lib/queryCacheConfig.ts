/**
 * TanStack Query cache configuration for the admin console.
 *
 * Registry data changes infrequently (orgs, flags, plans), so stale times lean
 * longer than the POS app. gcTime keeps data in memory for snappy navigation.
 */
const MS = 1000;
const MIN = 60 * MS;
const HOUR = 60 * MIN;

/** Default: 1 minute — admin data is not high-frequency. */
export const DEFAULT_STALE_TIME = 1 * MIN;
export const DEFAULT_GC_TIME = 1 * HOUR;

export const STALE_TIME = {
  /** Auth profile / role — changes very rarely within a session. */
  adminProfile: 10 * MIN,
  organizations: 1 * MIN,
  featureFlags: 1 * MIN,
  organizationFeatures: 1 * MIN,
  subscriptionPlans: 10 * MIN,
  subscriptions: 1 * MIN,
  invoices: 1 * MIN,
  organizationMembers: 1 * MIN,
  platformMessages: 1 * MIN,
} as const;
