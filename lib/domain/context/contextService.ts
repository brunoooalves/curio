import type {
  DietaryContext,
  DietaryContextInput,
} from "@/lib/domain/context/types";
import type { DietaryContextRepository } from "@/lib/persistence/repositories/dietaryContextRepository";

export class InvalidContextInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContextInputError";
  }
}

function dedupTrim(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeContextInput(input: DietaryContextInput): DietaryContextInput {
  const name = input.name.trim();
  if (!name) {
    throw new InvalidContextInputError("Nome do contexto e obrigatorio.");
  }
  if (input.servingsOverride !== null) {
    if (!Number.isInteger(input.servingsOverride) || input.servingsOverride <= 0) {
      throw new InvalidContextInputError(
        "servingsOverride deve ser um inteiro positivo ou null.",
      );
    }
  }
  return {
    name,
    restrictions: dedupTrim(input.restrictions),
    dislikes: dedupTrim(input.dislikes),
    preferences: dedupTrim(input.preferences),
    servingsOverride: input.servingsOverride,
  };
}

export async function listContexts(
  repository: DietaryContextRepository,
): Promise<DietaryContext[]> {
  return repository.list();
}

export async function getContext(
  repository: DietaryContextRepository,
  id: string,
): Promise<DietaryContext | null> {
  return repository.get(id);
}

export async function createContext(
  repository: DietaryContextRepository,
  input: DietaryContextInput,
): Promise<DietaryContext> {
  return repository.create(normalizeContextInput(input));
}

export async function updateContext(
  repository: DietaryContextRepository,
  id: string,
  input: DietaryContextInput,
): Promise<void> {
  await repository.update(id, normalizeContextInput(input));
}

export async function removeContext(
  repository: DietaryContextRepository,
  id: string,
): Promise<void> {
  await repository.delete(id);
}
