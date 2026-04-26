import type { DietaryContext } from "@/lib/domain/context/types";
import type { UserProfile } from "@/lib/domain/user/types";
import type { GenerationContext } from "./types";

export interface AdHocOverride {
  restrictions?: string[];
  dislikes?: string[];
  preferences?: string[];
}

export interface GenerationOverride {
  context?: DietaryContext | null;
  adHoc?: AdHocOverride;
  servings?: number | null;
}

function unionDedupTrim(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      const v = raw.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function pickServings(
  override: number | null | undefined,
  contextOverride: number | null | undefined,
  profileDefault: number,
): number {
  if (typeof override === "number" && override > 0) return override;
  if (typeof contextOverride === "number" && contextOverride > 0) return contextOverride;
  return profileDefault;
}

export function buildGenerationContext(
  profile: UserProfile,
  override: GenerationOverride = {},
): GenerationContext {
  const ctx = override.context ?? null;
  const adHoc = override.adHoc ?? {};
  return {
    restrictions: unionDedupTrim(profile.restrictions, ctx?.restrictions, adHoc.restrictions),
    dislikes: unionDedupTrim(profile.dislikes, ctx?.dislikes, adHoc.dislikes),
    preferences: unionDedupTrim(profile.preferences, ctx?.preferences, adHoc.preferences),
    abundantIngredients: unionDedupTrim(profile.abundantIngredients),
    servings: pickServings(override.servings, ctx?.servingsOverride, profile.servingsDefault),
  };
}
