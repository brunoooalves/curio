import type { Curriculum, Module } from "@/lib/domain/curriculum/types";
import type { UserState } from "./types";

export type ModuleStatus = "completed" | "current" | "available" | "locked";

export interface SwitchEvaluation {
  allowed: boolean;
  reason?: string;
}

export function getModuleStatus(
  mod: Module,
  userState: UserState,
  _curriculum: Curriculum,
): ModuleStatus {
  if (userState.completedModuleIds.includes(mod.id)) return "completed";
  if (userState.currentModuleId === mod.id) return "current";

  const completed = new Set(userState.completedModuleIds);
  const missing = mod.prerequisites.filter((id) => !completed.has(id));
  if (missing.length > 0) return "locked";

  return "available";
}

export function missingPrerequisites(
  mod: Module,
  userState: UserState,
  curriculum: Curriculum,
): Module[] {
  const completed = new Set(userState.completedModuleIds);
  return mod.prerequisites
    .filter((id) => !completed.has(id))
    .map((id) => curriculum.modules.find((m) => m.id === id))
    .filter((m): m is Module => m !== undefined);
}

export function canSwitchTo(
  targetModuleId: string,
  userState: UserState,
  curriculum: Curriculum,
): SwitchEvaluation {
  const target = curriculum.modules.find((m) => m.id === targetModuleId);
  if (!target) {
    return { allowed: false, reason: `Modulo "${targetModuleId}" nao existe no curriculo.` };
  }
  const status = getModuleStatus(target, userState, curriculum);
  if (status === "locked") {
    const missing = missingPrerequisites(target, userState, curriculum);
    const titles = missing.map((m) => `"${m.title}"`).join(", ");
    return {
      allowed: false,
      reason: `Pre-requisitos pendentes: ${titles || "(desconhecidos)"}.`,
    };
  }
  return { allowed: true };
}

export function findNextAvailableModule(
  userState: UserState,
  curriculum: Curriculum,
  fromWeekNumber: number,
): Module | null {
  const candidates = curriculum.modules
    .filter((m) => m.weekNumber > fromWeekNumber)
    .sort((a, b) => a.weekNumber - b.weekNumber);

  for (const candidate of candidates) {
    const status = getModuleStatus(candidate, userState, curriculum);
    if (status === "available" || status === "current") return candidate;
  }
  return null;
}
