import { describe, it, expect } from "vitest";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import type { UserProfile } from "@/lib/domain/user/types";
import type { DietaryContext } from "@/lib/domain/context/types";

const profile: UserProfile = {
  restrictions: ["sem gluten"],
  dislikes: ["coentro"],
  preferences: ["mediterranea"],
  abundantIngredients: ["abobrinha"],
  servingsDefault: 2,
};

const ctx: DietaryContext = {
  id: "c1",
  name: "Visita Ana e Joao",
  restrictions: ["lactose"],
  dislikes: ["pimenta"],
  preferences: ["picante"],
  servingsOverride: 4,
  createdAt: "now",
  updatedAt: "now",
};

describe("buildGenerationContext", () => {
  it("returns profile-only when no override", () => {
    const result = buildGenerationContext(profile);
    expect(result.restrictions).toEqual(["sem gluten"]);
    expect(result.dislikes).toEqual(["coentro"]);
    expect(result.preferences).toEqual(["mediterranea"]);
    expect(result.abundantIngredients).toEqual(["abobrinha"]);
    expect(result.servings).toBe(2);
  });

  it("merges profile + context (union, dedup, trim)", () => {
    const result = buildGenerationContext(profile, { context: ctx });
    expect(result.restrictions).toEqual(["sem gluten", "lactose"]);
    expect(result.dislikes).toEqual(["coentro", "pimenta"]);
    expect(result.preferences).toEqual(["mediterranea", "picante"]);
    expect(result.servings).toBe(4);
  });

  it("merges profile + ad-hoc", () => {
    const result = buildGenerationContext(profile, {
      adHoc: {
        restrictions: ["frutos do mar"],
        dislikes: [" coentro ", "pimenta"],
        preferences: ["ervas frescas"],
      },
    });
    expect(result.restrictions).toEqual(["sem gluten", "frutos do mar"]);
    expect(result.dislikes).toEqual(["coentro", "pimenta"]);
    expect(result.preferences).toEqual(["mediterranea", "ervas frescas"]);
    expect(result.servings).toBe(2);
  });

  it("merges profile + context + ad-hoc with proper dedup", () => {
    const result = buildGenerationContext(profile, {
      context: ctx,
      adHoc: {
        restrictions: ["lactose", " sem gluten ", "ovos"],
        preferences: ["picante", "umami"],
      },
    });
    expect(result.restrictions).toEqual(["sem gluten", "lactose", "ovos"]);
    expect(result.preferences).toEqual(["mediterranea", "picante", "umami"]);
  });

  it("override.servings beats context override beats profile default", () => {
    expect(
      buildGenerationContext(profile, { context: ctx, servings: 10 }).servings,
    ).toBe(10);
    expect(buildGenerationContext(profile, { context: ctx }).servings).toBe(4);
    expect(buildGenerationContext(profile).servings).toBe(2);
  });

  it("ignores non-positive servings overrides", () => {
    expect(buildGenerationContext(profile, { servings: 0 }).servings).toBe(2);
    expect(buildGenerationContext(profile, { servings: null }).servings).toBe(2);
  });

  it("abundantIngredients comes only from profile", () => {
    const result = buildGenerationContext(profile, {
      context: ctx,
      adHoc: { restrictions: [] },
    });
    expect(result.abundantIngredients).toEqual(["abobrinha"]);
  });

  it("trims and dedups across all sources", () => {
    const noisyProfile: UserProfile = {
      ...profile,
      restrictions: [" sem gluten ", "sem gluten"],
    };
    const result = buildGenerationContext(noisyProfile, {
      adHoc: { restrictions: [" sem gluten "] },
    });
    expect(result.restrictions).toEqual(["sem gluten"]);
  });
});
