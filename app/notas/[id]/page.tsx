import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { findReceiptById } from "@/lib/domain/receipt/receiptService";
import { getReceiptRepository } from "@/lib/persistence/mongo/factories";
import { formatCents } from "@/lib/domain/format/money";

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getReceiptRepository();
  const receipt = await findReceiptById({ receiptRepository: repo }, id);
  if (!receipt) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/notas" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">
          {receipt.store ?? "Nota fiscal"}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{receipt.purchaseDate}</Badge>
          <Badge variant="secondary">{formatCents(receipt.total)}</Badge>
          <Badge variant="outline">
            {receipt.items.length}{" "}
            {receipt.items.length === 1 ? "item" : "itens"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Modelo: {receipt.modelUsed}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Itens</h2>
        {receipt.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item identificado.</p>
        ) : (
          <ul className="flex flex-col">
            {receipt.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-2 border-b text-sm"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">{item.rawName}</span>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.canonicalName && (
                      <span>≡ {item.canonicalName}</span>
                    )}
                    {item.rawQuantity && <span>· {item.rawQuantity}</span>}
                    {item.unitPrice !== null && (
                      <span>· {formatCents(item.unitPrice)} unid.</span>
                    )}
                  </div>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatCents(item.totalPrice)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
