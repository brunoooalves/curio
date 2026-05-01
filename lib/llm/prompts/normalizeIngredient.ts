export function buildNormalizeIngredientsPrompt(rawNames: string[]): string {
  const list = rawNames.map((n, i) => `${i + 1}. ${n}`).join("\n");
  return [
    `Você normaliza nomes de ingredientes culinários em português do Brasil.`,
    `Para cada nome bruto recebido, devolva:`,
    `- canonicalName: forma canônica em português, sem marca, sem adjetivos qualificativos opcionais (ex: "Tomate" e não "Tomate maduro").`,
    `- defaultUnit: unidade padrão típica para COMPRA NO MERCADO ("g", "ml", "unidade", "maço") ou null se não houver uma única óbvia.`,
    ``,
    `Regras:`,
    `- Use a forma mais comum, no singular, com acentos corretos.`,
    `- defaultUnit deve ser orientado a MERCADO, não a receita. Prefira "ml" e "g" sobre "colher de sopa", "xícara" ou "pitada".`,
    `- Líquidos (azeite, leite, vinagre, vinho, água): "ml".`,
    `- Sólidos pesáveis (farinha, sal, açúcar, especiarias): "g".`,
    `- Itens contáveis no mercado (cebola, ovo, limão, alho-poró, abobrinha): "unidade".`,
    `- Folhosos vendidos em maço (manjericão, salsinha, hortelã): "maço".`,
    `- Em caso de ambiguidade, escolha "unidade".`,
    `- A ordem da resposta DEVE ser idêntica à ordem da entrada.`,
    ``,
    `Entrada (${rawNames.length} ingredientes):`,
    list,
  ].join("\n");
}
