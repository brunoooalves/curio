import type { Module } from "@/lib/domain/curriculum/types";

export function buildGenerateRecipesPrompt(module: Module, count: number): string {
  const concepts = module.concepts
    .map((c) => `- ${c.id} | ${c.title} (dificuldade ${c.difficulty}): ${c.description}`)
    .join("\n");

  return [
    `Voce e um chef instrutor que cria receitas didaticas para uma trilha de aprendizado de gastronomia.`,
    ``,
    `Modulo atual:`,
    `Semana ${module.weekNumber} — ${module.title}`,
    module.description,
    ``,
    `Conceitos do modulo:`,
    concepts,
    ``,
    `Tarefa: gere ${count} receitas distintas que pratiquem os conceitos acima.`,
    ``,
    `Regras:`,
    `- Cada receita deve exercitar pelo menos um conceito do modulo. Inclua os ids dos conceitos em "teachesConcepts".`,
    `- "mealType" deve ser um destes: cafe, almoco, jantar, lanche.`,
    `- "difficulty" e um inteiro de 1 a 5, coerente com a dificuldade dos conceitos exercitados.`,
    `- "estimatedMinutes" e tempo total realista (preparo + cocção).`,
    `- "servings" e um inteiro positivo.`,
    `- "ingredients" usa unidades praticas em portugues do Brasil ("1 xicara", "200 g", "a gosto").`,
    `- "steps" sao instrucoes claras e numeradas implicitamente pela ordem do array, em portugues do Brasil.`,
    `- Variedade: nao repita o mesmo prato com nomes diferentes.`,
    `- Sem comentarios meta — apenas os dados estruturados solicitados.`,
  ].join("\n");
}
