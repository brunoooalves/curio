import type { PracticeEvent, PracticeEventType } from "@/lib/domain/practice/types";

export interface ListPracticeEventsOptions {
  limit?: number;
  types?: PracticeEventType[];
}

export interface PracticeEventRepository {
  insert(event: PracticeEvent): Promise<void>;
  listAll(options?: ListPracticeEventsOptions): Promise<PracticeEvent[]>;
  listByRecipeId(recipeId: string): Promise<PracticeEvent[]>;
  listByModuleId(moduleId: string): Promise<PracticeEvent[]>;
}
