import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getActiveBatch } from "@/lib/domain/batch/batchService";
import { enrichBatchItems } from "@/lib/domain/batch/enrichBatch";
import {
  getBatchRepository,
  getRecipeRepository,
} from "@/lib/persistence/mongo/factories";
import { BatchView } from "@/components/batch-view";

export const dynamic = "force-dynamic";

export default async function LotePage() {
  const batchRepo = await getBatchRepository();
  const recipeRepo = await getRecipeRepository();
  const batch = await getActiveBatch({ batchRepository: batchRepo });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight">
          {batch ? "Lote em andamento" : "Comece um lote"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {batch
            ? "Sugestão de ordem; cozinhe quando quiser."
            : "Você ainda não tem nenhum lote desta semana."}
        </p>
      </header>

      {!batch ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">Sem lote em andamento.</p>
          <Link href="/lote/novo">
            <Button type="button" size="lg">
              Criar lote
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <BatchView batch={batch} items={await enrichBatchItems(recipeRepo, batch)} />
          <Link
            href="/lotes"
            className="text-center text-sm text-muted-foreground hover:underline"
          >
            Ver histórico de lotes →
          </Link>
        </>
      )}
    </main>
  );
}
