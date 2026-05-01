import Link from "next/link";
import { listAllStats } from "@/lib/domain/receipt/priceService";
import { getReceiptRepository } from "@/lib/persistence/mongo/factories";
import { PricesView } from "@/components/prices-view";

export const dynamic = "force-dynamic";

export default async function PrecosPage() {
  const repo = await getReceiptRepository();
  const stats = await listAllStats({ receiptRepository: repo });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Preços</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de preços por ingrediente, agregado das notas processadas.
        </p>
      </header>
      {stats.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem notas processadas ainda.{" "}
          <Link href="/notas/nova" className="underline">
            Subir uma nota
          </Link>{" "}
          para começar a ver preços aqui.
        </p>
      ) : (
        <PricesView stats={stats} />
      )}
    </main>
  );
}
