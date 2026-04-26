export const USER_STATE_ID = "default" as const;

export type UserStateId = typeof USER_STATE_ID;

export interface UserState {
  id: UserStateId;
  currentModuleId: string;
  completedModuleIds: string[];
  createdAt: string;
  updatedAt: string;
}
