import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  buildOrUpdateForBatch,
  getShoppingList,
} from "@/lib/domain/shopping/shoppingListService";
import { getActiveBatch } from "@/lib/domain/batch/batchService";
import {
  getBatchRepository,
  getIngredientNormalizer,
  getRecipeRepository,
  getShoppingListRepository,
} from "@/lib/persistence/mongo/factories";
import { ShoppingItemRow } from "@/components/shopping-item-row";
import { RecomputeListButton } from "@/components/recompute-list-button";
import type { ShoppingItem, ShoppingItemStatus } from "@/lib/domain/shopping/types";
import { estimateCostForLines, type EstimateLine } from "@/lib/domain/receipt/priceService";
import { getReceiptRepository } from "@/lib/persistence/mongo/factories";
import { formatCents } from "@/lib/domain/format/money";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";

export const dynamic = "force-dynamic";

const STATUS_GROUPS: { status: ShoppingItemStatus; label: string }[] = [
  { status: "pending", label: "A comprar" },
  { status: "bought", label: "Comprados" },
  { status: "have_at_home", label: "Tenho em casa" },
  { status: "ignored", label: "Ignorados" },
];

export default async function ListaPage() {
  const batchRepo = await getBatchRepository();
  const shoppingRepo = await getShoppingListRepository();
  const recipeRepo = await getRecipeRepository();

  const batch = await getActiveBatch({ batchRepository: batchRepo });

  if (!batch) {
    return (
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-tight">Lista de compras</h1>
          <p className="text-sm text-muted-foreground">
            Sem lote em andamento. Crie um lote ou simule sem persistir.
          </p>
        </header>
        <div className="flex flex-col gap-3 items-start">
          <Link href="/lote/novo">
            <Button type="button">Criar lote</Button>
          </Link>
          <Link href="/simular" className="text-sm text-muted-foreground hover:underline">
            Ou simule sem lote →
          </Link>
        </div>
      </main>
    );
  }

  let list = await getShoppingList({ shoppingListRepository: shoppingRepo }, batch.id);
  if (!list) {
    const normalize = await getIngredientNormalizer();
    list = await buildOrUpdateForBatch(
      {
        shoppingListRepository: shoppingRepo,
        batchRepository: batchRepo,
        recipeRepository: recipeRepo,
        normalize,
      },
      batch.id,
    );
  }

  const grouped = new Map<ShoppingItemStatus, ShoppingItem[]>();
  for (const status of STATUS_GROUPS.map((g) => g.status)) grouped.set(status, []);
  for (const item of list.items) {
    const arr = grouped.get(item.status);
    if (arr) arr.push(item);
  }

  const counts = {
    pending: grouped.get("pending")?.length ?? 0,
    bought: grouped.get("bought")?.length ?? 0,
    have_at_home: grouped.get("have_at_home")?.length ?? 0,
    ignored: grouped.get("ignored")?.length ?? 0,
  };

  const pendingItems = grouped.get("pending") ?? [];
  const pendingLines: ShoppingLine[] = pendingItems.map((item) => ({
    canonicalName: item.canonicalName,
    aggregatedQuantity: item.aggregatedQuantity,
    sourceRecipeIds: item.sourceRecipeIds,
  }));
  const receiptRepo = await getReceiptRepository();
  const estimate = await estimateCostForLines(
    { receiptRepository: receiptRepo },
    pendingLines,
  );
  const estimateByName = new Map<string, EstimateLine>();
  for (const e of estimate.perLine) estimateByName.set(e.canonicalName, e);
  const knownCount = estimate.perLine.filter((e) => e.estimated !== null).length;
  const unknownCount = estimate.perLine.length - knownCount;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight">Lista de compras</h1>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {counts.pending} pendentes · {counts.bought} comprados
          </p>
          <RecomputeListButton batchId={batch.id} />
        </div>
        <Link
          href={`/simular?fromBatch=${batch.id}`}
          className="text-sm text-muted-foreground hover:underline w-fit"
        >
          Simular variações →
        </Link>
        {pendingItems.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-1">
            <p>
              Estimativa: <strong>{formatCents(estimate.total)}</strong>{" "}
              <span className="text-xs text-muted-foreground">
                baseada em {knownCount}{" "}
                {knownCount === 1 ? "item com histórico" : "itens com histórico"}
              </span>
            </p>
            {unknownCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unknownCount}{" "}
                {unknownCount === 1 ? "item sem histórico" : "itens sem histórico"}
              </p>
            )}
          </div>
        )}
      </header>

      {list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Lista vazia. Adicione receitas ao lote para ver os itens aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {STATUS_GROUPS.map((group) => {
            const items = grouped.get(group.status) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={group.status} className="flex flex-col gap-1">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {group.label} ({items.length})
                </h2>
                <ul className="flex flex-col">
                  {items
                    .slice()
                    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
                    .map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        batchId={batch.id}
                        item={item}
                        estimate={
                          group.status === "pending"
                            ? estimateByName.get(item.canonicalName) ?? null
                            : null
                        }
                      />
                    ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
