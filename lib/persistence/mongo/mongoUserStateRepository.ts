import type { Collection, Db } from "mongodb";
import { USER_STATE_ID, type UserState, type UserStateId } from "@/lib/domain/user/types";
import { userStateSchema } from "@/lib/domain/user/schema";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";

const COLLECTION = "user_state";

interface UserStateDoc extends UserState {
  _id: UserStateId;
}

function toDoc(state: UserState): UserStateDoc {
  return { ...state, _id: state.id };
}

function fromDoc(doc: UserStateDoc): UserState {
  const { _id, ...rest } = doc;
  void _id;
  return userStateSchema.parse(rest);
}

export interface MongoUserStateRepositoryOptions {
  defaultModuleId: string;
}

export async function createMongoUserStateRepository(
  db: Db,
  options: MongoUserStateRepositoryOptions,
): Promise<UserStateRepository> {
  const collection = db.collection<UserStateDoc>(COLLECTION);
  return new MongoUserStateRepository(collection, options.defaultModuleId);
}

class MongoUserStateRepository implements UserStateRepository {
  constructor(
    private readonly collection: Collection<UserStateDoc>,
    private readonly defaultModuleId: string,
  ) {}

  async get(): Promise<UserState> {
    const existing = await this.collection.findOne({ _id: USER_STATE_ID });
    if (existing) return fromDoc(existing);

    const now = new Date().toISOString();
    const fresh: UserState = {
      id: USER_STATE_ID,
      currentModuleId: this.defaultModuleId,
      completedModuleIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(toDoc(fresh));
    return fresh;
  }

  async setCurrentModule(moduleId: string): Promise<void> {
    await this.ensureExists();
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: USER_STATE_ID },
      { $set: { currentModuleId: moduleId, updatedAt } },
    );
  }

  async markCompleted(moduleId: string): Promise<void> {
    await this.ensureExists();
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: USER_STATE_ID },
      {
        $addToSet: { completedModuleIds: moduleId },
        $set: { updatedAt },
      },
    );
  }

  private async ensureExists(): Promise<void> {
    const existing = await this.collection.findOne({ _id: USER_STATE_ID });
    if (!existing) {
      await this.get();
    }
  }
}
