import { describe, it, expect, vi } from "vitest";
import {
  getCurrentState,
  switchModule,
  markModuleCompleted,
  ModuleSwitchBlockedError,
} from "@/lib/domain/user/userService";
import type { UserState } from "@/lib/domain/user/types";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";

function mod(id: string, weekNumber: number, prerequisites: string[] = []): Module {
  return {
    id,
    weekNumber,
    title: `Mod ${id}`,
    description: `desc ${id}`,
    prerequisites,
    concepts: [{ id: `${id}.c`, title: "c", description: "c", difficulty: 1 }],
  };
}

const curriculum: Curriculum = {
  id: "c",
  title: "C",
  description: "C",
  domain: "gastronomia",
  modules: [mod("m1", 1, []), mod("m2", 2, ["m1"]), mod("m3", 3, ["m2"])],
};

function fakeRepo(initial: UserState): UserStateRepository & { _state: UserState } {
  let state = { ...initial };
  const obj = {
    _state: state,
    get: vi.fn(async () => ({ ...state })),
    setCurrentModule: vi.fn(async (moduleId: string) => {
      state = { ...state, currentModuleId: moduleId, updatedAt: new Date().toISOString() };
      obj._state = state;
    }),
    markCompleted: vi.fn(async (moduleId: string) => {
      if (!state.completedModuleIds.includes(moduleId)) {
        state = {
          ...state,
          completedModuleIds: [...state.completedModuleIds, moduleId],
          updatedAt: new Date().toISOString(),
        };
        obj._state = state;
      }
    }),
  };
  return obj;
}

function state(currentModuleId: string, completed: string[] = []): UserState {
  const now = new Date().toISOString();
  return {
    id: "default",
    currentModuleId,
    completedModuleIds: completed,
    createdAt: now,
    updatedAt: now,
  };
}

describe("getCurrentState", () => {
  it("returns the repository state", async () => {
    const repo = fakeRepo(state("m1"));
    const result = await getCurrentState(repo);
    expect(result.currentModuleId).toBe("m1");
  });
});

describe("switchModule", () => {
  it("switches to an available module", async () => {
    const repo = fakeRepo(state("m1", ["m1"]));
    await switchModule(repo, curriculum, "m2");
    expect(repo.setCurrentModule).toHaveBeenCalledWith("m2");
    expect(repo._state.currentModuleId).toBe("m2");
  });

  it("is a no-op when target equals current", async () => {
    const repo = fakeRepo(state("m1"));
    await switchModule(repo, curriculum, "m1");
    expect(repo.setCurrentModule).not.toHaveBeenCalled();
  });

  it("throws ModuleSwitchBlockedError when target is locked", async () => {
    const repo = fakeRepo(state("m1"));
    await expect(switchModule(repo, curriculum, "m3")).rejects.toBeInstanceOf(
      ModuleSwitchBlockedError,
    );
    expect(repo.setCurrentModule).not.toHaveBeenCalled();
  });

  it("throws when target does not exist", async () => {
    const repo = fakeRepo(state("m1"));
    await expect(switchModule(repo, curriculum, "ghost")).rejects.toBeInstanceOf(
      ModuleSwitchBlockedError,
    );
  });
});

describe("markModuleCompleted", () => {
  it("marks module completed and advances current to next available", async () => {
    const repo = fakeRepo(state("m1"));
    await markModuleCompleted(repo, curriculum, "m1");
    expect(repo.markCompleted).toHaveBeenCalledWith("m1");
    expect(repo._state.completedModuleIds).toContain("m1");
    expect(repo._state.currentModuleId).toBe("m2");
  });

  it("does not advance when completing a module other than the current one", async () => {
    const repo = fakeRepo(state("m2", ["m1"]));
    await markModuleCompleted(repo, curriculum, "m1");
    expect(repo._state.currentModuleId).toBe("m2");
  });

  it("does not duplicate when called twice on the same module", async () => {
    const repo = fakeRepo(state("m1"));
    await markModuleCompleted(repo, curriculum, "m1");
    await markModuleCompleted(repo, curriculum, "m1");
    expect(repo._state.completedModuleIds.filter((id) => id === "m1")).toHaveLength(1);
  });

  it("keeps current pointer and warns when there is no next module", async () => {
    const repo = fakeRepo(state("m3", ["m1", "m2"]));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await markModuleCompleted(repo, curriculum, "m3");
      expect(repo._state.completedModuleIds).toContain("m3");
      expect(repo._state.currentModuleId).toBe("m3");
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("throws when the module does not exist in curriculum", async () => {
    const repo = fakeRepo(state("m1"));
    await expect(markModuleCompleted(repo, curriculum, "ghost")).rejects.toThrowError(
      /nao existe/i,
    );
  });
});
