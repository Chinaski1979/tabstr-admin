import { describe, it, expect, vi, afterEach } from "vitest";

import { checkDeleteCapability } from "../orgDeleteService";
import type { OrganizationRegistry } from "@/types";

const PROJECT_1_URL = "https://jriafwvfwwlduldgdqjf.supabase.co";

function fakeJwt(role: string): string {
  return `header.${btoa(JSON.stringify({ role }))}.signature`;
}

const SERVICE_JWT = fakeJwt("service_role");
const ANON_JWT = fakeJwt("anon");

function orgWithUrl(supabaseUrl: string): Pick<OrganizationRegistry, "supabaseUrl"> {
  return { supabaseUrl };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkDeleteCapability", () => {
  it("is disabled for unknown project URLs with a reason", () => {
    const capability = checkDeleteCapability(orgWithUrl("https://unknown-project.supabase.co"));
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toMatch(/not on a configured shared project/i);
    expect(capability.projectId).toBeUndefined();
  });

  it("is disabled when the service key env var is missing, naming the env var", () => {
    vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", "");
    const capability = checkDeleteCapability(orgWithUrl(PROJECT_1_URL));
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toBe("Missing VITE_SHARED_PROJECT_1_SERVICE_KEY for this project");
    expect(capability.projectId).toBe("project-1");
    expect(capability.envVar).toBe("VITE_SHARED_PROJECT_1_SERVICE_KEY");
  });

  it("is enabled when the env var holds a service_role JWT", () => {
    vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", SERVICE_JWT);
    const capability = checkDeleteCapability(orgWithUrl(PROJECT_1_URL));
    expect(capability).toEqual({
      enabled: true,
      projectId: "project-1",
      envVar: "VITE_SHARED_PROJECT_1_SERVICE_KEY",
    });
  });

  it("is disabled when the env var holds the anon key instead of the service key", () => {
    vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", ANON_JWT);
    const capability = checkDeleteCapability(orgWithUrl(PROJECT_1_URL));
    expect(capability.enabled).toBe(false);
    expect(capability.reason).toMatch(/service role key/i);
    expect(capability.projectId).toBe("project-1");
  });

  it("resolves the project key per shared project", () => {
    vi.stubEnv("VITE_SHARED_PROJECT_2_SERVICE_KEY", SERVICE_JWT);
    const capability = checkDeleteCapability(
      orgWithUrl("https://ltnivqbihulzbbxmvefz.supabase.co"),
    );
    expect(capability.enabled).toBe(true);
    expect(capability.envVar).toBe("VITE_SHARED_PROJECT_2_SERVICE_KEY");

    // Project 1 is still without a key.
    expect(checkDeleteCapability(orgWithUrl(PROJECT_1_URL)).enabled).toBe(false);
  });

  it("normalizes trailing slashes when matching the project URL", () => {
    vi.stubEnv("VITE_SHARED_PROJECT_1_SERVICE_KEY", SERVICE_JWT);
    const capability = checkDeleteCapability(orgWithUrl(`${PROJECT_1_URL}/`));
    expect(capability.enabled).toBe(true);
  });
});
