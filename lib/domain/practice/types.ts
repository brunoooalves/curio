export type PracticeEventType = "completed" | "rejected" | "reverted";

export interface PracticeEvent {
  id: string;
  recipeId: string;
  moduleId: string;
  type: PracticeEventType;
  reflection: string | null;
  createdAt: string;
}
