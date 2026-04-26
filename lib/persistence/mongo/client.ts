import { MongoClient, type Db } from "mongodb";

interface MongoCache {
  client: MongoClient | null;
  clientPromise: Promise<MongoClient> | null;
}

const globalForMongo = globalThis as unknown as { __curioMongo?: MongoCache };

const cache: MongoCache = globalForMongo.__curioMongo ?? { client: null, clientPromise: null };

if (process.env.NODE_ENV !== "production") {
  globalForMongo.__curioMongo = cache;
}

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }
  return uri;
}

function getDbName(): string {
  return process.env.MONGODB_DB_NAME ?? "curio";
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cache.client) return cache.client;
  if (!cache.clientPromise) {
    cache.clientPromise = new MongoClient(getUri()).connect();
  }
  cache.client = await cache.clientPromise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getDbName());
}

export async function closeMongoClient(): Promise<void> {
  if (cache.client) {
    await cache.client.close();
    cache.client = null;
    cache.clientPromise = null;
  }
}
