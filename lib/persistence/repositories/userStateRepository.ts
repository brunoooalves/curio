import type { UserProfile, UserState } from "@/lib/domain/user/types";

export interface UserStateRepository {
  get(): Promise<UserState>;
  setCurrentModule(moduleId: string): Promise<void>;
  markCompleted(moduleId: string): Promise<void>;
  updateProfile(profile: UserProfile): Promise<void>;
}
