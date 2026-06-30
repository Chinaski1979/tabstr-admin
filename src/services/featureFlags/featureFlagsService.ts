import { getRegistryClient } from "@/integrations/supabase/client";
import type { CreateFeatureFlagInput, FeatureFlag, OrganizationFeature } from "@/types";

function mapFlag(row: any): FeatureFlag {
  return {
    id: row.id,
    featureName: row.feature_name,
    isEnabled: row.is_enabled ?? false,
    isPaid: row.is_paid ?? false,
    planName: row.plan_name ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at ?? row.created_at),
  };
}

const FLAG_SELECT =
  "id, feature_name, is_enabled, is_paid, plan_name, created_at, updated_at";

/** organization_features columns — see supabase/registry_schema.md */
const ORG_FEATURE_SELECT = "id, organization_id, feature_id, active";

export const featureFlagsService = {
  async getAll(): Promise<FeatureFlag[]> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select(FLAG_SELECT)
      .order("feature_name");

    if (error) throw error;
    return (data ?? []).map(mapFlag);
  },

  async setGlobalEnabled(flagId: string, isEnabled: boolean): Promise<FeatureFlag> {
    const supabase = getRegistryClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .update({ is_enabled: isEnabled })
      .eq("id", flagId)
      .select(FLAG_SELECT)
      .single();

    if (error) throw error;
    return mapFlag(data);
  },

  async create(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
    const supabase = getRegistryClient();
    const featureName = input.featureName.trim();
    const planName = input.planName?.trim() || null;

    const { data, error } = await supabase
      .from("feature_flags")
      .insert({
        feature_name: featureName,
        is_enabled: input.isEnabled ?? false,
        is_paid: input.isPaid ?? false,
        plan_name: planName,
      })
      .select(FLAG_SELECT)
      .single();

    if (error) throw error;
    return mapFlag(data);
  },

  /**
   * Per-organization view of every flag: all global definitions merged with
   * organization_features rows for this org (organization_id → organization_registry.id).
   */
  async getForOrganization(orgRegistryId: string): Promise<OrganizationFeature[]> {
    const supabase = getRegistryClient();

    const [flagsRes, orgFeaturesRes] = await Promise.all([
      supabase.from("feature_flags").select(FLAG_SELECT).order("feature_name"),
      supabase
        .from("organization_features")
        .select(ORG_FEATURE_SELECT)
        .eq("organization_id", orgRegistryId),
    ]);

    if (flagsRes.error) throw flagsRes.error;
    if (orgFeaturesRes.error) throw orgFeaturesRes.error;

    const orgFeatureByFlagId = new Map<string, { id: string; active: boolean }>();
    for (const row of orgFeaturesRes.data ?? []) {
      orgFeatureByFlagId.set(row.feature_id, {
        id: row.id,
        active: row.active ?? false,
      });
    }

    return (flagsRes.data ?? []).map((flagRow) => {
      const flag = mapFlag(flagRow);
      const orgFeature = orgFeatureByFlagId.get(flag.id);
      const active = orgFeature?.active ?? false;
      return {
        flag,
        organizationFeatureId: orgFeature?.id ?? null,
        active,
        effectivelyEnabled: flag.isEnabled && active,
      };
    });
  },

  async setOrganizationFeatureActive(
    orgRegistryId: string,
    flagId: string,
    active: boolean,
  ): Promise<void> {
    const supabase = getRegistryClient();
    const { error } = await supabase.from("organization_features").upsert(
      {
        organization_id: orgRegistryId,
        feature_id: flagId,
        active,
      },
      { onConflict: "organization_id,feature_id" },
    );

    if (error) throw error;
  },
};
