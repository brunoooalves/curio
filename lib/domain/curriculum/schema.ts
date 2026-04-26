import { z } from "zod";
import type { Curriculum, Module, Concept, Difficulty } from "./types";

export const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]) satisfies z.ZodType<Difficulty>;

export const conceptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: difficultySchema,
}) satisfies z.ZodType<Concept>;

export const moduleSchema = z.object({
  id: z.string().min(1),
  weekNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  concepts: z.array(conceptSchema).min(1),
  prerequisites: z.array(z.string()),
}) satisfies z.ZodType<Module>;

export const curriculumSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  domain: z.string().min(1),
  modules: z.array(moduleSchema).min(1),
}) satisfies z.ZodType<Curriculum>;
