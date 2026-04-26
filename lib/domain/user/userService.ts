import type { Curriculum } from "@/lib/domain/curriculum/types";
import type { UserProfile, UserState } from "./types";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";
import { canSwitchTo, findNextAvailableModule } from "./progression";

export class ModuleSwitchBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleSwitchBlockedError";
  }
}

export async function getCurrentState(
  repository: UserStateRepository,
): Promise<UserState> {
  return repository.get();
}

function dedupTrim(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeProfile(profile: UserProfile): UserProfile {
  if (!Number.isInteger(profile.servingsDefault) || profile.servingsDefault <= 0) {
    throw new Error("servingsDefault deve ser um inteiro positivo.");
  }
  return {
    restrictions: dedupTrim(profile.restrictions),
    dislikes: dedupTrim(profile.dislikes),
    preferences: dedupTrim(profile.preferences),
    abundantIngredients: dedupTrim(profile.abundantIngredients),
    servingsDefault: profile.servingsDefault,
  };
}

export async function updateProfile(
  repository: UserStateRepository,
  profile: UserProfile,
): Promise<void> {
  const normalized = normalizeProfile(profile);
  await repository.updateProfile(normalized);
}

export async function switchModule(
  repository: UserStateRepository,
  curriculum: Curriculum,
  targetModuleId: string,
): Promise<void> {
  const state = await repository.get();
  if (state.currentModuleId === targetModuleId) return;

  const evaluation = canSwitchTo(targetModuleId, state, curriculum);
  if (!evaluation.allowed) {
    throw new ModuleSwitchBlockedError(evaluation.reason ?? "Switch nao permitido.");
  }
  await repository.setCurrentModule(targetModuleId);
}

export async function markModuleCompleted(
  repository: UserStateRepository,
  curriculum: Curriculum,
  moduleId: string,
): Promise<void> {
  const before = await repository.get();
  const completedMod = curriculum.modules.find((m) => m.id === moduleId);
  if (!completedMod) {
    throw new Error(`Modulo "${moduleId}" nao existe no curriculo.`);
  }

  await repository.markCompleted(moduleId);

  const projected: UserState = {
    ...before,
    completedModuleIds: before.completedModuleIds.includes(moduleId)
      ? before.completedModuleIds
      : [...before.completedModuleIds, moduleId],
  };

  if (before.currentModuleId !== moduleId) return;

  const next = findNextAvailableModule(projected, curriculum, completedMod.weekNumber);
  if (!next) {
    console.warn(
      `[userService] No further available module after "${moduleId}"; current pointer left as-is.`,
    );
    return;
  }
  await repository.setCurrentModule(next.id);
}
