import path from "node:path";
import { loadCurriculum } from "@/lib/yaml/loadCurriculum";
import type { Curriculum, Module } from "@/lib/domain/curriculum/types";

const CURRICULUM_FILE = "gastronomia.yaml";

let cached: Curriculum | null = null;

export function getGastronomiaCurriculum(): Curriculum {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "curriculums", CURRICULUM_FILE);
  cached = loadCurriculum(filePath);
  return cached;
}

export function findModuleById(curriculum: Curriculum, moduleId: string): Module | null {
  return curriculum.modules.find((m) => m.id === moduleId) ?? null;
}
