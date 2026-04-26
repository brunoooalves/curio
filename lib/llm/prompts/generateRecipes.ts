import type { Module } from "@/lib/domain/curriculum/types";
import type { GenerationContext } from "@/lib/domain/generation/types";

function bullets(values: string[]): string {
  return values.map((v) => `- ${v}`).join("\n");
}

export function buildGenerateRecipesPrompt(
  module: Module,
  count: number,
  ctx: GenerationContext,
): string {
  const concepts = module.concepts
    .map((c) => `- ${c.id} | ${c.title} (dificuldade ${c.difficulty}): ${c.description}`)
    .join("\n");

  const sections: string[] = [
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
  ];

  if (ctx.restrictions.length > 0) {
    sections.push(
      "",
      "Restricoes alimentares (obrigatorio respeitar — nunca inclua estes itens):",
      bullets(ctx.restrictions),
    );
  }

  if (ctx.dislikes.length > 0) {
    sections.push(
      "",
      "Aversoes (preferir evitar; usar so se essencial e em pouca quantidade):",
      bullets(ctx.dislikes),
    );
  }

  if (ctx.preferences.length > 0) {
    sections.push(
      "",
      "Preferencias (priorizar quando possivel):",
      bullets(ctx.preferences),
    );
  }

  if (ctx.abundantIngredients.length > 0) {
    sections.push(
      "",
      "Ingredientes em abundancia (preferir incluir quando fizer sentido):",
      bullets(ctx.abundantIngredients),
    );
  }

  sections.push(
    "",
    `Porcoes: ${ctx.servings}.`,
    "",
    `Regras:`,
    `- Cada receita deve exercitar pelo menos um conceito do modulo. Inclua os ids dos conceitos em "teachesConcepts".`,
    `- "mealType" deve ser um destes: cafe, almoco, jantar, lanche.`,
    `- "difficulty" e um inteiro de 1 a 5, coerente com a dificuldade dos conceitos exercitados.`,
    `- "estimatedMinutes" e tempo total realista (preparo + cocção).`,
    `- "servings" deve ser ${ctx.servings}.`,
    `- "ingredients" usa unidades praticas em portugues do Brasil ("1 xicara", "200 g", "a gosto").`,
    `- "steps" sao instrucoes claras e numeradas implicitamente pela ordem do array, em portugues do Brasil.`,
    `- Variedade: nao repita o mesmo prato com nomes diferentes.`,
    `- Sem comentarios meta — apenas os dados estruturados solicitados.`,
  );

  return sections.join("\n");
}
