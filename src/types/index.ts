/**
 * Domain types for the Tabstr admin console.
 *
 * These map the registry database (snake_case) into camelCase domain objects.
 * Mapping happens in services — hooks and components only ever see these types.
 */

/** Two admin tiers. `full_access` can see everything (e.g. future revenue views). */
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
  createdAt: Date;
  updatedAt: Date;
}

export type CreateOrganizationInput = {
  organizationSlug: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isActive?: boolean;
};

/** A global feature flag definition (feature_flags table). */
export interface FeatureFlag {
  id: string;
  featureName: string;
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
  isEnabled?: boolean;
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

export interface SubscriptionPlanPrice {
  billingInterval: string;
  planPrice: number;
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  planName: string;
  prices: SubscriptionPlanPrice[];
}

export interface OrganizationSpecialPlan {
  id: string;
  organizationRegistryId: string;
  specialPlanName: string;
  specialPrice: number;
  isActive: boolean;
}

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

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string | null;
  status: string; // paid | failed | pending
  powertranzTransactionId: string | null;
  processedAt: string | null;
  createdAt: Date;
}
