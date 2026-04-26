import type { DietaryContext, DietaryContextInput } from "@/lib/domain/context/types";

export interface DietaryContextRepository {
  list(): Promise<DietaryContext[]>;
  get(id: string): Promise<DietaryContext | null>;
  create(input: DietaryContextInput): Promise<DietaryContext>;
  update(id: string, input: DietaryContextInput): Promise<void>;
  delete(id: string): Promise<void>;
}
