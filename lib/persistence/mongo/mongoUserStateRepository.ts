import type { Collection, Db } from "mongodb";
import {
  DEFAULT_USER_PROFILE,
  USER_STATE_ID,
  type UserProfile,
  type UserState,
  type UserStateId,
} from "@/lib/domain/user/types";
import { userStateSchema } from "@/lib/domain/user/schema";
import type { UserStateRepository } from "@/lib/persistence/repositories/userStateRepository";

const COLLECTION = "user_state";

interface UserStateDoc extends UserState {
  _id: UserStateId;
}

interface RawUserStateDoc {
  _id: UserStateId;
  id?: UserStateId;
  currentModuleId?: string;
  completedModuleIds?: string[];
  profile?: Partial<UserProfile>;
  createdAt?: string;
  updatedAt?: string;
}

function toDoc(state: UserState): UserStateDoc {
  return { ...state, _id: state.id };
}

function fromDoc(doc: UserStateDoc): UserState {
  const { _id: _ignored, ...rest } = doc;
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
    const raw = (await this.collection.findOne({ _id: USER_STATE_ID })) as
      | RawUserStateDoc
      | null;
    if (raw) {
      return this.migrateIfNeeded(raw);
    }

    const now = new Date().toISOString();
    const fresh: UserState = {
      id: USER_STATE_ID,
      currentModuleId: this.defaultModuleId,
      completedModuleIds: [],
      profile: { ...DEFAULT_USER_PROFILE },
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

  async updateProfile(profile: UserProfile): Promise<void> {
    await this.ensureExists();
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: USER_STATE_ID },
      { $set: { profile, updatedAt } },
    );
  }

  private async ensureExists(): Promise<void> {
    const existing = await this.collection.findOne({ _id: USER_STATE_ID });
    if (!existing) {
      await this.get();
    }
  }

  private async migrateIfNeeded(raw: RawUserStateDoc): Promise<UserState> {
    const hasProfile =
      !!raw.profile &&
      typeof raw.profile.servingsDefault === "number" &&
      Array.isArray(raw.profile.restrictions);

    if (hasProfile) {
      return fromDoc(raw as UserStateDoc);
    }

    const profile: UserProfile = {
      restrictions: raw.profile?.restrictions ?? DEFAULT_USER_PROFILE.restrictions,
      dislikes: raw.profile?.dislikes ?? DEFAULT_USER_PROFILE.dislikes,
      preferences: raw.profile?.preferences ?? DEFAULT_USER_PROFILE.preferences,
      abundantIngredients:
        raw.profile?.abundantIngredients ?? DEFAULT_USER_PROFILE.abundantIngredients,
      servingsDefault:
        raw.profile?.servingsDefault ?? DEFAULT_USER_PROFILE.servingsDefault,
    };
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: USER_STATE_ID },
      { $set: { profile, updatedAt } },
    );
    return fromDoc({
      ...(raw as UserStateDoc),
      profile,
      updatedAt,
    });
  }
}
