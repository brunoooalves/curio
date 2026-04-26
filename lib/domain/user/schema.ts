import { z } from "zod";
import { USER_STATE_ID, type UserState } from "./types";

export const userStateSchema = z.object({
  id: z.literal(USER_STATE_ID),
  currentModuleId: z.string().min(1),
  completedModuleIds: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
}) satisfies z.ZodType<UserState>;
