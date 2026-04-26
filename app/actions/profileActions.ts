"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/domain/user/userService";
import { getUserStateRepository } from "@/lib/persistence/mongo/factories";
import type { UserProfile } from "@/lib/domain/user/types";

export async function saveProfile(profile: UserProfile): Promise<void> {
  const repo = await getUserStateRepository();
  await updateProfile(repo, profile);
  revalidatePath("/");
  revalidatePath("/perfil");
}
