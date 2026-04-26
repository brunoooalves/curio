import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { curriculumSchema } from "@/lib/domain/curriculum/schema";
import type { Curriculum } from "@/lib/domain/curriculum/types";

export class CurriculumLoadError extends Error {
  constructor(
    message: string,
    readonly filePath: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CurriculumLoadError";
  }
}

export function loadCurriculum(filePath: string): Curriculum {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new CurriculumLoadError(`Curriculum file not found: ${filePath}`, filePath, err);
    }
    throw new CurriculumLoadError(
      `Failed to read curriculum file: ${filePath}`,
      filePath,
      err,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new CurriculumLoadError(
      `Failed to parse YAML in ${filePath}: ${(err as Error).message}`,
      filePath,
      err,
    );
  }

  const result = curriculumSchema.safeParse(parsed);
  if (!result.success) {
    throw new CurriculumLoadError(
      `Invalid curriculum in ${filePath}:\n${formatZodIssues(result.error)}`,
      filePath,
      result.error,
    );
  }

  assertUniqueIds(result.data, filePath);
  return result.data;
}

function formatZodIssues(error: import("zod").ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

function assertUniqueIds(curriculum: Curriculum, filePath: string): void {
  const moduleIds = new Set<string>();
  for (const mod of curriculum.modules) {
    if (moduleIds.has(mod.id)) {
      throw new CurriculumLoadError(
        `Duplicate module id "${mod.id}" in ${filePath}`,
        filePath,
      );
    }
    moduleIds.add(mod.id);

    const conceptIds = new Set<string>();
    for (const concept of mod.concepts) {
      if (conceptIds.has(concept.id)) {
        throw new CurriculumLoadError(
          `Duplicate concept id "${concept.id}" in module "${mod.id}" of ${filePath}`,
          filePath,
        );
      }
      conceptIds.add(concept.id);
    }
  }
}
