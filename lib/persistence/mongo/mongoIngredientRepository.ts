import type { Collection, Db } from "mongodb";
import type { NormalizedIngredient } from "@/lib/domain/ingredient/types";
import { normalizedIngredientSchema } from "@/lib/domain/ingredient/schema";
import type { IngredientRepository } from "@/lib/persistence/repositories/ingredientRepository";

const COLLECTION = "ingredients";

interface IngredientDoc extends NormalizedIngredient {
  _id: string;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function toDoc(ing: NormalizedIngredient): IngredientDoc {
  return { ...ing, _id: normalizeKey(ing.canonicalName) };
}

function fromDoc(doc: IngredientDoc): NormalizedIngredient {
  const { _id: _ignored, ...rest } = doc;
  return normalizedIngredientSchema.parse(rest);
}

export async function createMongoIngredientRepository(
  db: Db,
): Promise<IngredientRepository> {
  const collection = db.collection<IngredientDoc>(COLLECTION);
  await collection.createIndex({ canonicalName: 1 }, { unique: true });
  await collection.createIndex({ aliases: 1 });
  return new MongoIngredientRepository(collection);
}

class MongoIngredientRepository implements IngredientRepository {
  constructor(private readonly collection: Collection<IngredientDoc>) {}

  async findByAlias(alias: string): Promise<NormalizedIngredient | null> {
    const key = normalizeKey(alias);
    if (!key) return null;
    const doc = await this.collection.findOne({ aliases: key });
    if (doc) return fromDoc(doc);
    const direct = await this.collection.findOne({ _id: key });
    return direct ? fromDoc(direct) : null;
  }

  async findByCanonical(canonicalName: string): Promise<NormalizedIngredient | null> {
    const key = normalizeKey(canonicalName);
    const doc = await this.collection.findOne({ _id: key });
    return doc ? fromDoc(doc) : null;
  }

  async upsert(
    canonicalName: string,
    aliasesToAdd: string[],
    defaultUnit: string | null = null,
  ): Promise<NormalizedIngredient> {
    const id = normalizeKey(canonicalName);
    if (!id) throw new Error("canonicalName invalido.");
    const aliasKeys = Array.from(
      new Set([id, ...aliasesToAdd.map(normalizeKey).filter(Boolean)]),
    );
    const now = new Date().toISOString();

    const existing = await this.collection.findOne({ _id: id });
    if (existing) {
      const merged = Array.from(new Set([...existing.aliases, ...aliasKeys]));
      const nextUnit = existing.defaultUnit ?? defaultUnit;
      await this.collection.updateOne(
        { _id: id },
        { $set: { aliases: merged, defaultUnit: nextUnit, updatedAt: now } },
      );
      return fromDoc({ ...existing, aliases: merged, defaultUnit: nextUnit, updatedAt: now });
    }

    const fresh: IngredientDoc = {
      _id: id,
      canonicalName: canonicalName.trim(),
      aliases: aliasKeys,
      defaultUnit,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(fresh);
    return fromDoc(fresh);
  }

  async list(): Promise<NormalizedIngredient[]> {
    const docs = await this.collection.find().sort({ canonicalName: 1 }).toArray();
    return docs.map(fromDoc);
  }
}
