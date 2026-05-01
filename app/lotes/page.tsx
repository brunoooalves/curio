import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listBatches } from "@/lib/domain/batch/batchService";
import { getBatchRepository } from "@/lib/persistence/mongo/factories";
import { formatRelativeTime } from "@/lib/domain/practice/formatRelativeTime";

export const dynamic = "force-dynamic";

export default async function LotesPage() {
  const batchRepo = await getBatchRepository();
  const batches = await listBatches({ batchRepository: batchRepo });

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Lotes</h1>
        <p className="text-sm text-muted-foreground">Histórico de lotes em ordem reversa.</p>
      </header>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum lote ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {batches.map((b) => {
            const total = b.items.length;
            const done = b.items.filter((i) => i.status === "done").length;
            const skipped = b.items.filter((i) => i.status === "skipped").length;
            const pending = total - done - skipped;
            return (
              <li key={b.id}>
                <Link href={`/lote/${b.id}`} className="block">
                  <Card className="hover:bg-accent/40 transition-colors">
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <CardTitle className="text-base">
                        Criado {formatRelativeTime(b.createdAt)}
                      </CardTitle>
                      {pending > 0 ? (
                        <Badge variant="default">Em andamento</Badge>
                      ) : (
                        <Badge variant="secondary">Fechado</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>{done} feitos</span>
                      <span>·</span>
                      <span>{skipped} pulados</span>
                      <span>·</span>
                      <span>{pending} a fazer</span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
