import type { Curriculum } from "@/lib/domain/curriculum/types";
import type { UserState } from "./types";
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
