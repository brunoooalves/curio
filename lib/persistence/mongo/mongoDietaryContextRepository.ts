import type { Collection, Db } from "mongodb";
import { randomUUID } from "node:crypto";
import type {
  DietaryContext,
  DietaryContextInput,
} from "@/lib/domain/context/types";
import { dietaryContextSchema } from "@/lib/domain/context/schema";
import type { DietaryContextRepository } from "@/lib/persistence/repositories/dietaryContextRepository";

const COLLECTION = "dietary_contexts";

interface DietaryContextDoc extends DietaryContext {
  _id: string;
}

function toDoc(ctx: DietaryContext): DietaryContextDoc {
  return { ...ctx, _id: ctx.id };
}

function fromDoc(doc: DietaryContextDoc): DietaryContext {
  const { _id: _ignored, ...rest } = doc;
  return dietaryContextSchema.parse(rest);
}

export async function createMongoDietaryContextRepository(
  db: Db,
): Promise<DietaryContextRepository> {
  const collection = db.collection<DietaryContextDoc>(COLLECTION);
  await collection.createIndex({ updatedAt: -1 });
  return new MongoDietaryContextRepository(collection);
}

class MongoDietaryContextRepository implements DietaryContextRepository {
  constructor(private readonly collection: Collection<DietaryContextDoc>) {}

  async list(): Promise<DietaryContext[]> {
    const docs = await this.collection.find().sort({ updatedAt: -1 }).toArray();
    return docs.map(fromDoc);
  }

  async get(id: string): Promise<DietaryContext | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? fromDoc(doc) : null;
  }

  async create(input: DietaryContextInput): Promise<DietaryContext> {
    const now = new Date().toISOString();
    const ctx: DietaryContext = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(toDoc(ctx));
    return ctx;
  }

  async update(id: string, input: DietaryContextInput): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: id },
      { $set: { ...input, updatedAt } },
    );
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }
}
