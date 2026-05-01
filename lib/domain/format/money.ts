export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return "R$ —";
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = Math.floor(abs / 100);
  const remainder = abs % 100;
  const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centsStr = remainder.toString().padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reaisStr},${centsStr}`;
}

export function parseCents(input: string): number {
  if (typeof input !== "string") {
    throw new Error("parseCents requer string.");
  }
  const cleaned = input
    .replace(/R\$\s?/i, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) throw new Error("parseCents: entrada vazia.");

  const negative = cleaned.startsWith("-");
  const body = negative ? cleaned.slice(1) : cleaned;

  // Aceita "5,99", "5.99", "5", "1234,5", "1.234,56", "1,234.56".
  const match = /^(\d{1,3}(?:[.,]\d{3})*)([.,]\d{1,2})?$|^(\d+)([.,]\d{1,2})?$/.exec(body);
  if (!match) {
    throw new Error(`parseCents: nao consigo interpretar "${input}".`);
  }

  let intPart: string;
  let fracPart: string;
  if (match[3] !== undefined) {
    intPart = match[3];
    fracPart = match[4] ? match[4].slice(1) : "";
  } else {
    intPart = match[1]!.replace(/[.,]/g, "");
    fracPart = match[2] ? match[2].slice(1) : "";
  }

  if (fracPart.length === 1) fracPart = fracPart + "0";
  if (fracPart.length === 0) fracPart = "00";

  const n = Number.parseInt(intPart + fracPart, 10);
  if (!Number.isFinite(n)) throw new Error(`parseCents: nao consigo interpretar "${input}".`);
  return negative ? -n : n;
}
