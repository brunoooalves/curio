import type { Collection, Db } from "mongodb";
import type { ShoppingItemStatus, ShoppingList } from "@/lib/domain/shopping/types";
import { shoppingListSchema } from "@/lib/domain/shopping/schema";
import type { ShoppingListRepository } from "@/lib/persistence/repositories/shoppingListRepository";

const COLLECTION = "shopping_lists";

interface ShoppingListDoc extends ShoppingList {
  _id: string;
}

function toDoc(list: ShoppingList): ShoppingListDoc {
  return { ...list, _id: list.id };
}

function fromDoc(doc: ShoppingListDoc): ShoppingList {
  const { _id: _ignored, ...rest } = doc;
  return shoppingListSchema.parse(rest);
}

export async function createMongoShoppingListRepository(
  db: Db,
): Promise<ShoppingListRepository> {
  const collection = db.collection<ShoppingListDoc>(COLLECTION);
  await collection.createIndex({ batchId: 1 }, { unique: true });
  return new MongoShoppingListRepository(collection);
}

class MongoShoppingListRepository implements ShoppingListRepository {
  constructor(private readonly collection: Collection<ShoppingListDoc>) {}

  async findByBatchId(batchId: string): Promise<ShoppingList | null> {
    const doc = await this.collection.findOne({ batchId });
    return doc ? fromDoc(doc) : null;
  }

  async upsert(list: ShoppingList): Promise<void> {
    await this.collection.replaceOne({ _id: list.id }, toDoc(list), { upsert: true });
  }

  async updateItemStatus(
    listId: string,
    itemId: string,
    status: ShoppingItemStatus,
    updatedAt: string,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: listId, "items.id": itemId },
      {
        $set: {
          "items.$.status": status,
          "items.$.updatedAt": updatedAt,
          updatedAt,
        },
      },
    );
  }
}
