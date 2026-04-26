import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { createMongoPracticeEventRepository } from "@/lib/persistence/mongo/mongoPracticeEventRepository";
import type { PracticeEvent, PracticeEventType } from "@/lib/domain/practice/types";
import type { PracticeEventRepository } from "@/lib/persistence/repositories/practiceEventRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: PracticeEventRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoPracticeEventRepository(db);
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("practice_events").deleteMany({});
});

function makeEvent(
  overrides: Partial<PracticeEvent> & { type?: PracticeEventType } = {},
): PracticeEvent {
  return {
    id: randomUUID(),
    recipeId: "r1",
    moduleId: "m1",
    type: "completed",
    reflection: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("mongoPracticeEventRepository", () => {
  it("inserts and returns events in reverse chronological order", async () => {
    const t0 = "2026-01-01T00:00:00.000Z";
    const t1 = "2026-01-02T00:00:00.000Z";
    const t2 = "2026-01-03T00:00:00.000Z";

    await repo.insert(makeEvent({ recipeId: "r-old", createdAt: t0 }));
    await repo.insert(makeEvent({ recipeId: "r-new", createdAt: t2 }));
    await repo.insert(makeEvent({ recipeId: "r-mid", createdAt: t1 }));

    const all = await repo.listAll();
    expect(all.map((e) => e.recipeId)).toEqual(["r-new", "r-mid", "r-old"]);
  });

  it("filters listAll by types", async () => {
    await repo.insert(makeEvent({ type: "completed" }));
    await repo.insert(makeEvent({ type: "rejected" }));
    await repo.insert(makeEvent({ type: "reverted" }));

    const onlyCompleted = await repo.listAll({ types: ["completed"] });
    expect(onlyCompleted.map((e) => e.type)).toEqual(["completed"]);

    const completedAndReverted = await repo.listAll({
      types: ["completed", "reverted"],
    });
    expect(completedAndReverted.map((e) => e.type).sort()).toEqual([
      "completed",
      "reverted",
    ]);
  });

  it("respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await repo.insert(
        makeEvent({ createdAt: new Date(2026, 0, i + 1).toISOString() }),
      );
    }
    const limited = await repo.listAll({ limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it("listByRecipeId returns only events for that recipe in reverse order", async () => {
    await repo.insert(
      makeEvent({ recipeId: "r1", createdAt: "2026-01-01T00:00:00.000Z" }),
    );
    await repo.insert(
      makeEvent({ recipeId: "r2", createdAt: "2026-01-02T00:00:00.000Z" }),
    );
    await repo.insert(
      makeEvent({
        recipeId: "r1",
        type: "rejected",
        createdAt: "2026-01-03T00:00:00.000Z",
      }),
    );

    const events = await repo.listByRecipeId("r1");
    expect(events.map((e) => e.type)).toEqual(["rejected", "completed"]);
  });

  it("listByModuleId returns only events for that module", async () => {
    await repo.insert(makeEvent({ moduleId: "m1" }));
    await repo.insert(makeEvent({ moduleId: "m2" }));
    await repo.insert(makeEvent({ moduleId: "m1" }));

    const m1 = await repo.listByModuleId("m1");
    const m2 = await repo.listByModuleId("m2");
    expect(m1).toHaveLength(2);
    expect(m2).toHaveLength(1);
  });

  it("does not leak _id to domain types", async () => {
    const e = makeEvent();
    await repo.insert(e);
    const events = await repo.listAll();
    expect(events).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(events[0], "_id")).toBe(false);
  });

  it("preserves nullable reflection on read", async () => {
    await repo.insert(makeEvent({ reflection: "primeira tentativa, queimei o roux" }));
    await repo.insert(makeEvent({ reflection: null }));

    const all = await repo.listAll();
    const reflections = all.map((e) => e.reflection);
    expect(reflections).toContain("primeira tentativa, queimei o roux");
    expect(reflections).toContain(null);
  });
});
