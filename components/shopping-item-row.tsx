"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markShoppingItem } from "@/app/actions/shoppingActions";
import { formatQuantity } from "@/lib/domain/shopping/formatQuantity";
import type { ShoppingItem, ShoppingItemStatus } from "@/lib/domain/shopping/types";

const STATUS_LABEL: Record<ShoppingItemStatus, string> = {
  pending: "A comprar",
  bought: "Comprado",
  have_at_home: "Tenho em casa",
  ignored: "Ignorar",
};

const NEXT_STATUSES: ShoppingItemStatus[] = ["pending", "bought", "have_at_home", "ignored"];

export function ShoppingItemRow({
  batchId,
  item,
}: {
  batchId: string;
  item: ShoppingItem;
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

  return (
    <li className={dimmed ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3 py-2 border-b">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-base font-medium">{item.canonicalName}</span>
          <span className="text-sm text-muted-foreground">
            {formatQuantity(item.aggregatedQuantity)} ·{" "}
            usado em {item.sourceRecipeIds.length}{" "}
            {item.sourceRecipeIds.length === 1 ? "receita" : "receitas"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap gap-1 justify-end">
            {NEXT_STATUSES.map((status) => (
              <Button
                key={status}
                type="button"
                variant={item.status === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(status)}
                disabled={pending}
              >
                {STATUS_LABEL[status]}
              </Button>
            ))}
          </div>
          <Badge variant="secondary" className="text-xs">
            {STATUS_LABEL[item.status]}
          </Badge>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </li>
  );
}
