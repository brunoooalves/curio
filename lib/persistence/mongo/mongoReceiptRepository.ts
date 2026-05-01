import type { Collection, Db, Filter } from "mongodb";
import type { Receipt } from "@/lib/domain/receipt/types";
import { receiptSchema } from "@/lib/domain/receipt/schema";
import type {
  ItemWithReceipt,
  ListReceiptsOptions,
  ReceiptRepository,
} from "@/lib/persistence/repositories/receiptRepository";

const COLLECTION = "receipts";

interface ReceiptDoc extends Receipt {
  _id: string;
}

function toDoc(receipt: Receipt): ReceiptDoc {
  return { ...receipt, _id: receipt.id };
}

function fromDoc(doc: ReceiptDoc): Receipt {
  const { _id: _ignored, ...rest } = doc;
  return receiptSchema.parse(rest);
}

export async function createMongoReceiptRepository(db: Db): Promise<ReceiptRepository> {
  const collection = db.collection<ReceiptDoc>(COLLECTION);
  await collection.createIndex({ purchaseDate: -1 });
  await collection.createIndex({ "items.canonicalName": 1 });
  await collection.createIndex({ createdAt: -1 });
  return new MongoReceiptRepository(collection);
}

class MongoReceiptRepository implements ReceiptRepository {
  constructor(private readonly collection: Collection<ReceiptDoc>) {}

  async insert(receipt: Receipt): Promise<void> {
    await this.collection.insertOne(toDoc(receipt));
  }

  async findById(id: string): Promise<Receipt | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? fromDoc(doc) : null;
  }

  async list(options: ListReceiptsOptions = {}): Promise<Receipt[]> {
    const filter: Filter<ReceiptDoc> = {};
    if (options.from || options.to) {
      const range: Record<string, string> = {};
      if (options.from) range.$gte = options.from;
      if (options.to) range.$lte = options.to;
      filter.purchaseDate = range;
    }
    let cursor = this.collection.find(filter).sort({ purchaseDate: -1, createdAt: -1 });
    if (options.limit && options.limit > 0) cursor = cursor.limit(options.limit);
    const docs = await cursor.toArray();
    return docs.map(fromDoc);
  }

  async listItemsByCanonicalName(
    canonicalName: string,
    options: { limit?: number } = {},
  ): Promise<ItemWithReceipt[]> {
    const limit = options.limit && options.limit > 0 ? options.limit : 100;
    const docs = await this.collection
      .find({ "items.canonicalName": canonicalName })
      .sort({ purchaseDate: -1 })
      .limit(limit)
      .toArray();

    const out: ItemWithReceipt[] = [];
    for (const doc of docs) {
      const receipt = fromDoc(doc);
      for (const item of receipt.items) {
        if (item.canonicalName === canonicalName) {
          out.push({
            item,
            receipt: {
              id: receipt.id,
              purchaseDate: receipt.purchaseDate,
              store: receipt.store,
            },
          });
        }
      }
    }
    return out.sort((a, b) =>
      a.receipt.purchaseDate < b.receipt.purchaseDate ? 1 : -1,
    );
  }
}
