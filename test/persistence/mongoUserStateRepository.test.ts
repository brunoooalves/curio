import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { createMongoUserStateRepository } from "@/lib/persistence/mongo/mongoUserStateRepository";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";

let mongo: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let repo: UserStateRepository;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  client = new MongoClient(mongo.getUri());
  await client.connect();
  db = client.db("curio-test");
  repo = await createMongoUserStateRepository(db, { defaultModuleId: "m1" });
}, 60_000);

afterAll(async () => {
  await client.close();
  await mongo.stop();
});

beforeEach(async () => {
  await db.collection("user_state").deleteMany({});
});

describe("mongoUserStateRepository", () => {
  it("get() creates a default document if none exists", async () => {
    const state = await repo.get();
    expect(state.id).toBe("default");
    expect(state.currentModuleId).toBe("m1");
    expect(state.completedModuleIds).toEqual([]);
    expect(state.profile.servingsDefault).toBe(2);
    expect(state.profile.restrictions).toEqual([]);
    expect(state.createdAt).toBeTruthy();
    expect(state.updatedAt).toBeTruthy();
  });

  it("migrates a legacy document missing profile, persisting the default", async () => {
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.collection("user_state") as any).insertOne({
      _id: "default",
      id: "default",
      currentModuleId: "m2",
      completedModuleIds: ["m1"],
      createdAt: now,
      updatedAt: now,
    });

    const state = await repo.get();
    expect(state.profile.servingsDefault).toBe(2);
    expect(state.currentModuleId).toBe("m2");
    expect(state.completedModuleIds).toEqual(["m1"]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persisted = (await (db.collection("user_state") as any).findOne({
      _id: "default",
    })) as { profile?: { servingsDefault?: number } } | null;
    expect(persisted?.profile?.servingsDefault).toBe(2);
  });

  it("updateProfile persists the new profile and bumps updatedAt", async () => {
    const before = await repo.get();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.updateProfile({
      restrictions: ["sem gluten"],
      dislikes: ["coentro"],
      preferences: ["mediterranea"],
      abundantIngredients: ["abobrinha"],
      servingsDefault: 4,
    });
    const after = await repo.get();
    expect(after.profile.restrictions).toEqual(["sem gluten"]);
    expect(after.profile.servingsDefault).toBe(4);
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it("get() is idempotent — calling twice returns the same id", async () => {
    const a = await repo.get();
    const b = await repo.get();
    expect(b.id).toBe(a.id);
    expect(b.createdAt).toBe(a.createdAt);
    const count = await db.collection("user_state").countDocuments();
    expect(count).toBe(1);
  });

  it("setCurrentModule updates currentModuleId and updatedAt", async () => {
    const before = await repo.get();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.setCurrentModule("m2");
    const after = await repo.get();
    expect(after.currentModuleId).toBe("m2");
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  it("markCompleted adds the module id to completedModuleIds", async () => {
    await repo.get();
    await repo.markCompleted("m1");
    const after = await repo.get();
    expect(after.completedModuleIds).toEqual(["m1"]);
  });

  it("markCompleted is idempotent — same id is not duplicated", async () => {
    await repo.get();
    await repo.markCompleted("m1");
    await repo.markCompleted("m1");
    const after = await repo.get();
    expect(after.completedModuleIds).toEqual(["m1"]);
  });

  it("setCurrentModule auto-creates default document if missing", async () => {
    await repo.setCurrentModule("m2");
    const state = await repo.get();
    expect(state.currentModuleId).toBe("m2");
  });

  it("does not leak _id to domain types", async () => {
    const state = await repo.get();
    expect(Object.prototype.hasOwnProperty.call(state, "_id")).toBe(false);
  });
});
