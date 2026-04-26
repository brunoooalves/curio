export function buildNormalizeIngredientsPrompt(rawNames: string[]): string {
  const list = rawNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
  return [
    `Voce normaliza nomes de ingredientes culinarios em portugues do Brasil.`,
    `Para cada nome bruto recebido, devolva:`,
    `- canonicalName: forma canonica em portugues, sem marca, sem adjetivos qualificativos opcionais (ex: "Tomate" e nao "Tomate maduro").`,
    `- defaultUnit: unidade padrao tipica para compra/medicao ("g", "ml", "unidade", "maço", "colher de sopa") ou null se nao houver uma unica obvia.`,
    ``,
    `Regras:`,
    `- Use a forma mais comum, no singular.`,
    `- Mantenha acentos.`,
    `- Se for tempero/erva: defaultUnit e tipicamente "g" ou "maço".`,
    `- Se for liquido: "ml".`,
    `- Se for ingrediente que se compra por unidade (cebola, ovo, limao): "unidade".`,
    `- Em caso de ambiguidade, escolha "unidade".`,
    `- A ordem da resposta DEVE ser identica a ordem da entrada.`,
    ``,
    `Entrada (${rawNames.length} ingredientes):`,
    list,
  ].join("\n");
}
