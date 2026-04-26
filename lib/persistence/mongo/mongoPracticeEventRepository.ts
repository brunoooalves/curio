import type { Collection, Db, Filter } from "mongodb";
import type { PracticeEvent } from "@/lib/domain/practice/types";
import { practiceEventSchema } from "@/lib/domain/practice/schema";
import type {
  ListPracticeEventsOptions,
  PracticeEventRepository,
} from "@/lib/persistence/repositories/practiceEventRepository";

const COLLECTION = "practice_events";

interface PracticeEventDoc extends PracticeEvent {
  _id: string;
}

function toDoc(event: PracticeEvent): PracticeEventDoc {
  return { ...event, _id: event.id };
}

function fromDoc(doc: PracticeEventDoc): PracticeEvent {
  const { _id: _ignored, ...rest } = doc;
  return practiceEventSchema.parse(rest);
}

export async function createMongoPracticeEventRepository(
  db: Db,
): Promise<PracticeEventRepository> {
  const collection = db.collection<PracticeEventDoc>(COLLECTION);
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ recipeId: 1 });
  await collection.createIndex({ moduleId: 1 });
  return new MongoPracticeEventRepository(collection);
}

class MongoPracticeEventRepository implements PracticeEventRepository {
  constructor(private readonly collection: Collection<PracticeEventDoc>) {}

  async insert(event: PracticeEvent): Promise<void> {
    await this.collection.insertOne(toDoc(event));
  }

  async listAll(options: ListPracticeEventsOptions = {}): Promise<PracticeEvent[]> {
    const filter: Filter<PracticeEventDoc> = {};
    if (options.types && options.types.length > 0) {
      filter.type = { $in: options.types };
    }
    let cursor = this.collection.find(filter).sort({ createdAt: -1 });
    if (options.limit && options.limit > 0) cursor = cursor.limit(options.limit);
    const docs = await cursor.toArray();
    return docs.map(fromDoc);
  }

  async listByRecipeId(recipeId: string): Promise<PracticeEvent[]> {
    const docs = await this.collection.find({ recipeId }).sort({ createdAt: -1 }).toArray();
    return docs.map(fromDoc);
  }

  async listByModuleId(moduleId: string): Promise<PracticeEvent[]> {
    const docs = await this.collection.find({ moduleId }).sort({ createdAt: -1 }).toArray();
    return docs.map(fromDoc);
  }
}
