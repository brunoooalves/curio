import { describe, it, expect } from "vitest";
import { batchSchema } from "@/lib/domain/batch/schema";
import type { Batch } from "@/lib/domain/batch/types";

function baseBatch(items: Batch["items"]): Batch {
  const sum = items.length;
  return {
    id: "b1",
    mealsByType: { cafe: 0, almoco: sum, jantar: 0, lanche: 0 },
    items,
    generationContextSnapshot: null,
    createdAt: "2026-04-26T12:00:00.000Z",
    updatedAt: "2026-04-26T12:00:00.000Z",
  };
}

describe("batchSchema", () => {
  it("accepts a well-formed batch", () => {
    const batch = baseBatch([
      {
        id: "i1",
        mealType: "almoco",
        recipeId: "r1",
        suggestedOrder: 1,
        status: "pending",
        doneAt: null,
      },
      {
        id: "i2",
        mealType: "almoco",
        recipeId: "r2",
        suggestedOrder: 2,
        status: "pending",
        doneAt: null,
      },
    ]);
    expect(() => batchSchema.parse(batch)).not.toThrow();
  });

  it("rejects duplicate item ids", () => {
    const batch = baseBatch([
      {
        id: "dup",
        mealType: "almoco",
        recipeId: "r1",
        suggestedOrder: 1,
        status: "pending",
        doneAt: null,
      },
      {
        id: "dup",
        mealType: "almoco",
        recipeId: "r2",
        suggestedOrder: 2,
        status: "pending",
        doneAt: null,
      },
    ]);
    expect(() => batchSchema.parse(batch)).toThrowError(/duplicado/);
  });

  it("rejects non-contiguous suggestedOrder", () => {
    const batch = baseBatch([
      {
        id: "i1",
        mealType: "almoco",
        recipeId: "r1",
        suggestedOrder: 1,
        status: "pending",
        doneAt: null,
      },
      {
        id: "i2",
        mealType: "almoco",
        recipeId: "r2",
        suggestedOrder: 3,
        status: "pending",
        doneAt: null,
      },
    ]);
    expect(() => batchSchema.parse(batch)).toThrowError(/contiguo/);
  });

  it("rejects items.length mismatch with mealsByType sum", () => {
    const batch: Batch = {
      ...baseBatch([
        {
          id: "i1",
          mealType: "almoco",
          recipeId: "r1",
          suggestedOrder: 1,
          status: "pending",
          doneAt: null,
        },
      ]),
      mealsByType: { cafe: 0, almoco: 5, jantar: 0, lanche: 0 },
    };
    expect(() => batchSchema.parse(batch)).toThrowError(/diferente/);
  });
});
