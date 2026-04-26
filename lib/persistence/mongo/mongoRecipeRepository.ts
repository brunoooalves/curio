import type { Collection, Db, Filter } from "mongodb";
import type { Recipe, RecipeStatus } from "@/lib/domain/recipe/types";
import { recipeSchema } from "@/lib/domain/recipe/schema";
import type {
  FindRecipesByModuleOptions,
  RecipeRepository,
} from "@/lib/persistence/repositories/recipeRepository";

const COLLECTION = "recipes";

interface RecipeDoc extends Recipe {
  _id: string;
}

function toDoc(recipe: Recipe): RecipeDoc {
  return { ...recipe, _id: recipe.id };
}

function fromDoc(doc: RecipeDoc): Recipe {
  const { _id: _ignored, ...rest } = doc;
  return recipeSchema.parse(rest);
}

export async function createMongoRecipeRepository(db: Db): Promise<RecipeRepository> {
  const collection: Collection<RecipeDoc> = db.collection<RecipeDoc>(COLLECTION);
  await collection.createIndex({ moduleId: 1 });
  await collection.createIndex({ status: 1 });
  return new MongoRecipeRepository(collection);
}

class MongoRecipeRepository implements RecipeRepository {
  constructor(private readonly collection: Collection<RecipeDoc>) {}

  async findByModuleId(
    moduleId: string,
    options: FindRecipesByModuleOptions = {},
  ): Promise<Recipe[]> {
    const filter: Filter<RecipeDoc> = { moduleId };
    if (options.excludeStatuses && options.excludeStatuses.length > 0) {
      filter.status = { $nin: options.excludeStatuses };
    }
    const docs = await this.collection.find(filter).sort({ createdAt: 1 }).toArray();
    return docs.map(fromDoc);
  }

  async findByStatus(
    status: RecipeStatus,
    options: { moduleId?: string } = {},
  ): Promise<Recipe[]> {
    const filter: Filter<RecipeDoc> = { status };
    if (options.moduleId) filter.moduleId = options.moduleId;
    const docs = await this.collection.find(filter).sort({ updatedAt: -1 }).toArray();
    return docs.map(fromDoc);
  }

  async findById(id: string): Promise<Recipe | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? fromDoc(doc) : null;
  }

  async insertMany(recipes: Recipe[]): Promise<void> {
    if (recipes.length === 0) return;
    const docs = recipes.map(toDoc);
    await this.collection.insertMany(docs);
  }

  async updateStatus(id: string, status: RecipeStatus): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.collection.updateOne({ _id: id }, { $set: { status, updatedAt } });
  }
}
