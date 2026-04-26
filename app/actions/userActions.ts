"use server";

import { revalidatePath } from "next/cache";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import {
  markModuleCompleted,
  switchModule,
} from "@/lib/domain/user/userService";
import { getUserStateRepository } from "@/lib/persistence/mongo/factories";

export async function switchToModule(targetModuleId: string): Promise<void> {
  const curriculum = getGastronomiaCurriculum();
  const repository = await getUserStateRepository();
  await switchModule(repository, curriculum, targetModuleId);
  revalidatePath("/");
  revalidatePath("/modulos");
}

export async function completeCurrentModule(moduleId: string): Promise<void> {
  const curriculum = getGastronomiaCurriculum();
  const repository = await getUserStateRepository();
  await markModuleCompleted(repository, curriculum, moduleId);
  revalidatePath("/");
  revalidatePath("/modulos");
}
