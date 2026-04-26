"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recomputeShoppingList } from "@/app/actions/shoppingActions";

export function RecomputeListButton({ batchId }: { batchId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await recomputeShoppingList(batchId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao recalcular lista.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Recalculando..." : "Recalcular"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
