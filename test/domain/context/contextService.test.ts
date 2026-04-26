import { describe, it, expect, vi } from "vitest";
import {
  createContext,
  listContexts,
  getContext,
  updateContext,
  removeContext,
  normalizeContextInput,
  InvalidContextInputError,
} from "@/lib/domain/context/contextService";
import type { DietaryContext } from "@/lib/domain/context/types";
import type { DietaryContextRepository } from "@/lib/persistence/repositories/dietaryContextRepository";
import { randomUUID } from "node:crypto";

function fakeRepo(initial: DietaryContext[] = []): DietaryContextRepository & {
  _store: Map<string, DietaryContext>;
} {
  const store = new Map<string, DietaryContext>(initial.map((c) => [c.id, c]));
  return {
    _store: store,
    list: vi.fn(async () =>
      Array.from(store.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    ),
    get: vi.fn(async (id: string) => store.get(id) ?? null),
    create: vi.fn(async (input) => {
      const now = new Date().toISOString();
      const ctx: DietaryContext = {
        id: randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      store.set(ctx.id, ctx);
      return ctx;
    }),
    update: vi.fn(async (id, input) => {
      const existing = store.get(id);
      if (!existing) return;
      store.set(id, { ...existing, ...input, updatedAt: new Date().toISOString() });
    }),
    delete: vi.fn(async (id) => {
      store.delete(id);
    }),
  };
}

describe("normalizeContextInput", () => {
  it("trims name and dedups arrays", () => {
    const out = normalizeContextInput({
      name: "  Visita Ana  ",
      restrictions: [" sem gluten ", "sem gluten", ""],
      dislikes: [],
      preferences: ["picante", "picante"],
      servingsOverride: null,
    });
    expect(out.name).toBe("Visita Ana");
    expect(out.restrictions).toEqual(["sem gluten"]);
    expect(out.preferences).toEqual(["picante"]);
  });

  it("rejects empty name", () => {
    expect(() =>
      normalizeContextInput({
        name: "   ",
        restrictions: [],
        dislikes: [],
        preferences: [],
        servingsOverride: null,
      }),
    ).toThrowError(InvalidContextInputError);
  });

  it("rejects non-positive servingsOverride", () => {
    expect(() =>
      normalizeContextInput({
        name: "ok",
        restrictions: [],
        dislikes: [],
        preferences: [],
        servingsOverride: 0,
      }),
    ).toThrowError(InvalidContextInputError);
  });

  it("accepts servingsOverride=null", () => {
    const out = normalizeContextInput({
      name: "ok",
      restrictions: [],
      dislikes: [],
      preferences: [],
      servingsOverride: null,
    });
    expect(out.servingsOverride).toBeNull();
  });
});

describe("contextService CRUD", () => {
  it("create normalizes input", async () => {
    const repo = fakeRepo();
    const created = await createContext(repo, {
      name: "  Visita  ",
      restrictions: [" sem gluten ", ""],
      dislikes: [],
      preferences: [],
      servingsOverride: null,
    });
    expect(created.name).toBe("Visita");
    expect(created.restrictions).toEqual(["sem gluten"]);
  });

  it("create throws when name is empty", async () => {
    const repo = fakeRepo();
    await expect(
      createContext(repo, {
        name: "",
        restrictions: [],
        dislikes: [],
        preferences: [],
        servingsOverride: null,
      }),
    ).rejects.toBeInstanceOf(InvalidContextInputError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("list, get, update, remove pass through normalization where applicable", async () => {
    const repo = fakeRepo();
    const created = await createContext(repo, {
      name: "X",
      restrictions: [],
      dislikes: [],
      preferences: [],
      servingsOverride: null,
    });

    expect(await listContexts(repo)).toHaveLength(1);
    expect(await getContext(repo, created.id)).not.toBeNull();

    await updateContext(repo, created.id, {
      name: "  Renamed  ",
      restrictions: [" novo ", "novo"],
      dislikes: [],
      preferences: [],
      servingsOverride: 6,
    });
    const updated = await getContext(repo, created.id);
    expect(updated?.name).toBe("Renamed");
    expect(updated?.restrictions).toEqual(["novo"]);

    await removeContext(repo, created.id);
    expect(await getContext(repo, created.id)).toBeNull();
  });
});
