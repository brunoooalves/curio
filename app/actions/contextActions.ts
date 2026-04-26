"use server";

import { revalidatePath } from "next/cache";
import {
  createContext,
  removeContext,
  updateContext,
} from "@/lib/domain/context/contextService";
import { getDietaryContextRepository } from "@/lib/persistence/mongo/factories";
import type { DietaryContextInput } from "@/lib/domain/context/types";

function revalidateAll(): void {
  revalidatePath("/contextos");
  revalidatePath("/");
}

export async function createContextAction(
  input: DietaryContextInput,
): Promise<{ id: string }> {
  const repo = await getDietaryContextRepository();
  const created = await createContext(repo, input);
  revalidateAll();
  return { id: created.id };
}

export async function updateContextAction(
  id: string,
  input: DietaryContextInput,
): Promise<void> {
  const repo = await getDietaryContextRepository();
  await updateContext(repo, id, input);
  revalidateAll();
}

export async function deleteContextAction(id: string): Promise<void> {
  const repo = await getDietaryContextRepository();
  await removeContext(repo, id);
  revalidateAll();
}
