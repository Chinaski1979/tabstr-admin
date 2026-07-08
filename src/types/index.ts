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
  prices: SubscriptionPlanPrice[];
}

export type CreateSubscriptionPlanInput = {
  planName: string;
  prices: { billingInterval: BillingInterval; planPrice: number }[];
  isActive?: boolean;
};

export type UpdateSubscriptionPlanInput = {
  planName: string;
  prices: { id?: string; billingInterval: BillingInterval; planPrice: number }[];
  isActive?: boolean;
};

export interface OrganizationSpecialPlan {
  id: string;
  organizationRegistryId: string;
  specialPlanName: string;
  specialPrice: number;
  isActive: boolean;
}

export type CreateOrganizationSpecialPlanInput = {
  specialPlanName: string;
  specialPrice: number;
  isActive?: boolean;
};

export type UpdateOrganizationSpecialPlanInput = {
  specialPlanName: string;
  specialPrice: number;
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
