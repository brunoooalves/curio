import { redirect } from "next/navigation";

export default async function SimularPage({
  searchParams,
}: {
  searchParams: Promise<{ fromBatch?: string }>;
}) {
  const { fromBatch } = await searchParams;
  const target = fromBatch
    ? `/lote/novo?modo=avancado&fromBatch=${encodeURIComponent(fromBatch)}`
    : "/lote/novo?modo=avancado";
  redirect(target);
}
