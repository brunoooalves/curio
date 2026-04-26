import Link from "next/link";
import { notFound } from "next/navigation";
import { getBatch } from "@/lib/domain/batch/batchService";
import { enrichBatchItems } from "@/lib/domain/batch/enrichBatch";
import {
  getBatchRepository,
  getRecipeRepository,
} from "@/lib/persistence/mongo/factories";
import { BatchView } from "@/components/batch-view";
import { formatRelativeTime } from "@/lib/domain/practice/formatRelativeTime";

export const dynamic = "force-dynamic";

export default async function LoteByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batchRepo = await getBatchRepository();
  const recipeRepo = await getRecipeRepository();
  const batch = await getBatch({ batchRepository: batchRepo }, id);
  if (!batch) notFound();

  const items = await enrichBatchItems(recipeRepo, batch);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/lotes" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Lote</h1>
        <p className="text-sm text-muted-foreground">
          Criado {formatRelativeTime(batch.createdAt)}
        </p>
      </header>

      <BatchView batch={batch} items={items} />
    </main>
  );
}
