import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listReceipts } from "@/lib/domain/receipt/receiptService";
import { getReceiptRepository } from "@/lib/persistence/mongo/factories";
import { formatCents } from "@/lib/domain/format/money";

export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const repo = await getReceiptRepository();
  const receipts = await listReceipts({ receiptRepository: repo });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold leading-tight">Notas fiscais</h1>
          <Link href="/notas/nova">
            <Button type="button">Nova nota</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Histórico de notas processadas, em ordem cronológica reversa.
        </p>
      </header>

      {receipts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma nota processada ainda. Use &ldquo;Nova nota&rdquo; para começar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {receipts.map((receipt) => (
            <li key={receipt.id}>
              <Link href={`/notas/${receipt.id}`} className="block">
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base">
                        {receipt.store ?? "Mercado"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {receipt.purchaseDate}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatCents(receipt.total)}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {receipt.items.length}{" "}
                    {receipt.items.length === 1 ? "item" : "itens"}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
