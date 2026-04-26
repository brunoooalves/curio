export interface DietaryContext {
  id: string;
  name: string;
  restrictions: string[];
  dislikes: string[];
  preferences: string[];
  servingsOverride: number | null;
  createdAt: string;
  updatedAt: string;
}

export type DietaryContextInput = Omit<
  DietaryContext,
  "id" | "createdAt" | "updatedAt"
>;
