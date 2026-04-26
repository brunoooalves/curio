import { describe, it, expect } from "vitest";
import {
  getModuleStatus,
  canSwitchTo,
  missingPrerequisites,
  findNextAvailableModule,
} from "@/lib/domain/user/progression";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";
import type { UserState } from "@/lib/domain/user/types";

function mod(id: string, weekNumber: number, prerequisites: string[] = []): Module {
  return {
    id,
    weekNumber,
    title: `Mod ${id}`,
    description: `Mod ${id} desc`,
    prerequisites,
    concepts: [{ id: `${id}.c1`, title: "c", description: "c", difficulty: 1 }],
  };
}

const curriculum: Curriculum = {
  id: "c",
  title: "C",
  description: "C",
  domain: "gastronomia",
  modules: [
    mod("m1", 1, []),
    mod("m2", 2, ["m1"]),
    mod("m3", 3, ["m2"]),
    mod("m4", 4, ["m1", "m2"]),
  ],
};

function state(currentModuleId: string, completed: string[] = []): UserState {
  const now = new Date().toISOString();
  return {
    id: "default",
    currentModuleId,
    completedModuleIds: completed,
    profile: {
      restrictions: [],
      dislikes: [],
      preferences: [],
      abundantIngredients: [],
      servingsDefault: 2,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("getModuleStatus", () => {
  it("returns 'current' for the active module", () => {
    const s = state("m1");
    const m1 = curriculum.modules[0]!;
    expect(getModuleStatus(m1, s, curriculum)).toBe("current");
  });

  it("returns 'completed' when in completedModuleIds", () => {
    const s = state("m2", ["m1"]);
    const m1 = curriculum.modules[0]!;
    expect(getModuleStatus(m1, s, curriculum)).toBe("completed");
  });

  it("returns 'available' when no prereqs and not current/completed", () => {
    const s = state("m1");
    const m1NoPrereq = mod("xx", 99, []);
    expect(getModuleStatus(m1NoPrereq, s, curriculum)).toBe("available");
  });

  it("returns 'locked' when prerequisites are unmet", () => {
    const s = state("m1");
    const m2 = curriculum.modules[1]!;
    expect(getModuleStatus(m2, s, curriculum)).toBe("locked");
  });

  it("returns 'available' once all prereqs are completed", () => {
    const s = state("m2", ["m1"]);
    const m4 = curriculum.modules[3]!;
    expect(getModuleStatus(m4, s, curriculum)).toBe("locked");

    const s2 = state("m3", ["m1", "m2"]);
    expect(getModuleStatus(m4, s2, curriculum)).toBe("available");
  });
});

describe("missingPrerequisites", () => {
  it("returns the modules that are still pending", () => {
    const s = state("m1", ["m1"]);
    const m4 = curriculum.modules[3]!;
    const missing = missingPrerequisites(m4, s, curriculum);
    expect(missing.map((m) => m.id)).toEqual(["m2"]);
  });

  it("returns empty when all prereqs are met", () => {
    const s = state("m4", ["m1", "m2"]);
    const m4 = curriculum.modules[3]!;
    expect(missingPrerequisites(m4, s, curriculum)).toEqual([]);
  });
});

describe("canSwitchTo", () => {
  it("allows switching to an available module", () => {
    const s = state("m1", ["m1"]);
    const result = canSwitchTo("m2", s, curriculum);
    expect(result.allowed).toBe(true);
  });

  it("allows switching to a completed module (revisit)", () => {
    const s = state("m3", ["m1", "m2"]);
    const result = canSwitchTo("m1", s, curriculum);
    expect(result.allowed).toBe(true);
  });

  it("blocks switching to a locked module with readable reason", () => {
    const s = state("m1");
    const result = canSwitchTo("m3", s, curriculum);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Pre-requisitos/i);
    expect(result.reason).toMatch(/m2|Mod m2/);
  });

  it("blocks switching to a non-existent module", () => {
    const s = state("m1");
    const result = canSwitchTo("nope", s, curriculum);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/nao existe/i);
  });
});

describe("findNextAvailableModule", () => {
  it("returns the next module by weekNumber if available", () => {
    const s = state("m1", ["m1"]);
    const next = findNextAvailableModule(s, curriculum, 1);
    expect(next?.id).toBe("m2");
  });

  it("skips modules whose prereqs are still unmet", () => {
    const s = state("m1", ["m1"]);
    const next = findNextAvailableModule(s, curriculum, 2);
    expect(next).toBeNull();
  });

  it("returns null when there is no module after fromWeekNumber", () => {
    const s = state("m4", ["m1", "m2", "m3", "m4"]);
    expect(findNextAvailableModule(s, curriculum, 4)).toBeNull();
  });
});
