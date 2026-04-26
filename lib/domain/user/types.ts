export const USER_STATE_ID = "default" as const;

export type UserStateId = typeof USER_STATE_ID;

export interface UserProfile {
  restrictions: string[];
  dislikes: string[];
  preferences: string[];
  abundantIngredients: string[];
  servingsDefault: number;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  restrictions: [],
  dislikes: [],
  preferences: [],
  abundantIngredients: [],
  servingsDefault: 2,
};

export interface UserState {
  id: UserStateId;
  currentModuleId: string;
  completedModuleIds: string[];
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}
