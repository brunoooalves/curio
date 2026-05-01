import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listReceipts } from "@/lib/domain/receipt/receiptService";
import { listAllStats } from "@/lib/domain/receipt/priceService";
import { getReceiptRepository } from "@/lib/persistence/mongo/factories";
import { formatCents } from "@/lib/domain/format/money";
import { PricesView } from "@/components/prices-view";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "notas" | "precos";

function parseTab(value: string | undefined): Tab {
  return value === "precos" ? "precos" : "notas";
}

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab = parseTab(rawTab);

  const repo = await getReceiptRepository();

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight">Mercado</h1>
        <p className="text-sm text-muted-foreground">
          Suba notas fiscais para ver preços e estimar lotes futuros.
        </p>
      </header>

      <Tabs current={tab} />

      {tab === "notas" ? (
        <NotasTab repoFactory={() => repo} />
      ) : (
        <PrecosTab repoFactory={() => repo} />
      )}
    </main>
  );
}

function Tabs({ current }: { current: Tab }) {
  const items: { tab: Tab; label: string }[] = [
    { tab: "notas", label: "Notas" },
    { tab: "precos", label: "Preços" },
  ];

  return (
    <nav className="grid grid-cols-2 rounded-lg border bg-background p-1 text-sm">
      {items.map((item) => {
        const active = current === item.tab;
        const href = item.tab === "notas" ? "/mercado" : `/mercado?tab=${item.tab}`;
        return (
          <Link
            key={item.tab}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center h-10 rounded-md font-medium transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function NotasTab({
  repoFactory,
}: {
  repoFactory: () => Awaited<ReturnType<typeof getReceiptRepository>>;
}) {
  const receipts = await listReceipts({ receiptRepository: repoFactory() });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {receipts.length === 0
            ? "Nenhuma nota processada ainda."
            : `${receipts.length} ${receipts.length === 1 ? "nota processada" : "notas processadas"}.`}
        </p>
        <Link href="/notas/nova">
          <Button type="button">Nova nota</Button>
        </Link>
      </div>

      {receipts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Use &ldquo;Nova nota&rdquo; para enviar uma foto da nota fiscal.
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
    </section>
  );
}

async function PrecosTab({
  repoFactory,
}: {
  repoFactory: () => Awaited<ReturnType<typeof getReceiptRepository>>;
}) {
  const stats = await listAllStats({ receiptRepository: repoFactory() });

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Histórico de preços por ingrediente, agregado das notas processadas.
      </p>
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
    </section>
  );
}
