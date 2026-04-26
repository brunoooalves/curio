import type { Collection, Db } from "mongodb";
import type { Batch, BatchItemStatus } from "@/lib/domain/batch/types";
import { batchSchema } from "@/lib/domain/batch/schema";
import type { BatchRepository } from "@/lib/persistence/repositories/batchRepository";

const COLLECTION = "batches";

interface BatchDoc extends Batch {
  _id: string;
}

function toDoc(batch: Batch): BatchDoc {
  return { ...batch, _id: batch.id };
}

function fromDoc(doc: BatchDoc): Batch {
  const { _id: _ignored, ...rest } = doc;
  return batchSchema.parse(rest);
}

export async function createMongoBatchRepository(db: Db): Promise<BatchRepository> {
  const collection = db.collection<BatchDoc>(COLLECTION);
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ "items.status": 1 });
  return new MongoBatchRepository(collection);
}

class MongoBatchRepository implements BatchRepository {
  constructor(private readonly collection: Collection<BatchDoc>) {}

  async findActive(): Promise<Batch | null> {
    const doc = await this.collection.findOne(
      { "items.status": "pending" },
      { sort: { createdAt: -1 } },
    );
    return doc ? fromDoc(doc) : null;
  }

  async findById(id: string): Promise<Batch | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? fromDoc(doc) : null;
  }

  async list(): Promise<Batch[]> {
    const docs = await this.collection.find().sort({ createdAt: -1 }).toArray();
    return docs.map(fromDoc);
  }

  async insert(batch: Batch): Promise<void> {
    await this.collection.insertOne(toDoc(batch));
  }

  async updateItemStatus(
    batchId: string,
    itemId: string,
    status: BatchItemStatus,
    doneAt: string | null,
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: batchId, "items.id": itemId },
      {
        $set: {
          "items.$.status": status,
          "items.$.doneAt": doneAt,
          updatedAt,
        },
      },
    );
  }

  async replaceItemRecipe(
    batchId: string,
    itemId: string,
    newRecipeId: string,
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: batchId, "items.id": itemId },
      {
        $set: {
          "items.$.recipeId": newRecipeId,
          updatedAt,
        },
      },
    );
  }

  async reorderItems(batchId: string, orderedItemIds: string[]): Promise<void> {
    const doc = await this.collection.findOne({ _id: batchId });
    if (!doc) return;
    if (orderedItemIds.length !== doc.items.length) {
      throw new Error(
        `reorderItems: expected ${doc.items.length} ids, got ${orderedItemIds.length}.`,
      );
    }
    const ids = new Set(orderedItemIds);
    if (ids.size !== orderedItemIds.length) {
      throw new Error("reorderItems: duplicated ids.");
    }
    for (const item of doc.items) {
      if (!ids.has(item.id)) {
        throw new Error(`reorderItems: id "${item.id}" missing in input.`);
      }
    }

    const byId = new Map(doc.items.map((item) => [item.id, item]));
    const reordered = orderedItemIds.map((id, index) => {
      const item = byId.get(id)!;
      return { ...item, suggestedOrder: index + 1 };
    });
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne(
      { _id: batchId },
      { $set: { items: reordered, updatedAt } },
    );
  }
}
