"use client";

import { useState, useTransition } from "react";
import { markShoppingItem } from "@/app/actions/shoppingActions";
import { formatQuantity } from "@/lib/domain/shopping/formatQuantity";
import { formatCents } from "@/lib/domain/format/money";
import { cn } from "@/lib/utils";
import type { ShoppingItem, ShoppingItemStatus } from "@/lib/domain/shopping/types";
import type { EstimateLine } from "@/lib/domain/receipt/priceService";

const STATUS_LABEL: Record<ShoppingItemStatus, string> = {
  pending: "A comprar",
  bought: "Comprado",
  have_at_home: "Tenho em casa",
  ignored: "Ignorar",
};

const STATUSES: ShoppingItemStatus[] = [
  "pending",
  "bought",
  "have_at_home",
  "ignored",
];

function estimateLabel(estimate: EstimateLine | null): string | null {
  if (!estimate) return null;
  if (estimate.basis === "unknown" || estimate.estimated === null) return null;
  if (estimate.basis === "last") return `≈ ${formatCents(estimate.estimated)} (último)`;
  return `≈ ${formatCents(estimate.estimated)} (média)`;
}

export function ShoppingItemRow({
  batchId,
  item,
  estimate,
}: {
  batchId: string;
  item: ShoppingItem;
  estimate?: EstimateLine | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(status: ShoppingItemStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await markShoppingItem(batchId, item.id, status);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao atualizar item.");
      }
    });
  }

  const dimmed = item.status !== "pending";
  const priceLabel = estimateLabel(estimate ?? null);

  return (
    <li
      className={cn(
        "border-b last:border-b-0",
        item.status === "ignored" && "opacity-50",
        item.status === "have_at_home" && "opacity-70",
        item.status === "bought" && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3 py-3">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className={cn(
              "text-base font-medium truncate",
              dimmed && "line-through",
            )}
          >
            {item.canonicalName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatQuantity(item.aggregatedQuantity)}
            {item.sourceRecipeIds.length > 0 && (
              <>
                {" · em "}
                {item.sourceRecipeIds.length}{" "}
                {item.sourceRecipeIds.length === 1 ? "receita" : "receitas"}
              </>
            )}
            {priceLabel && <span className="ml-1 italic">{priceLabel}</span>}
          </span>
        </div>
        <select
          aria-label={`Status de ${item.canonicalName}`}
          className="h-11 min-w-[140px] rounded-md border bg-background px-2 text-sm font-medium"
          value={item.status}
          disabled={pending}
          onChange={(e) => setStatus(e.target.value as ShoppingItemStatus)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive pb-2">{error}</p>}
    </li>
  );
}
