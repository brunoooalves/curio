"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BatchItemActions } from "@/components/batch-item-actions";
import { BatchReorder } from "@/components/batch-reorder";
import type { Batch, BatchItem } from "@/lib/domain/batch/types";
import type { EnrichedBatchItem } from "@/lib/domain/batch/enrichBatch";
import { cn } from "@/lib/utils";

const MEAL_LABEL: Record<BatchItem["mealType"], string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  lanche: "Lanche",
};

const STATUS_LABEL: Record<BatchItem["status"], string> = {
  pending: "A fazer",
  done: "Feito",
  skipped: "Pulado",
};

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Fácil",
  2: "Médio",
  3: "Médio",
  4: "Difícil",
  5: "Difícil",
};

export type BatchViewItem = EnrichedBatchItem;

export function BatchView({ batch, items }: { batch: Batch; items: BatchViewItem[] }) {
  const [reordering, setReordering] = useState(false);

  const counts = {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    pending: items.filter((i) => i.status === "pending").length,
  };
  const progress = counts.total > 0 ? (counts.done / counts.total) * 100 : 0;

  const sorted = [...items].sort((a, b) => a.suggestedOrder - b.suggestedOrder);
  const nextPendingId = sorted.find((i) => i.status === "pending")?.id ?? null;

  if (reordering) {
    return (
      <BatchReorder
        batchId={batch.id}
        initialItems={sorted}
        onClose={() => setReordering(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            {counts.done} de {counts.total} feitos
            {counts.skipped > 0 ? ` · ${counts.skipped} pulados` : ""}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="compact"
            onClick={() => setReordering(true)}
            disabled={counts.total === 0}
          >
            Reordenar
          </Button>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((item) => (
          <li key={item.id}>
            <ItemCard
              batchId={batch.id}
              item={item}
              isNext={item.id === nextPendingId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  const filled = Math.max(1, Math.min(3, Math.ceil(difficulty / 2)));
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`Dificuldade: ${DIFFICULTY_LABEL[difficulty] ?? difficulty}`}>
      <span className="font-mono tracking-tighter" aria-hidden>
        {"●".repeat(filled)}
        <span className="opacity-30">{"○".repeat(3 - filled)}</span>
      </span>
      {DIFFICULTY_LABEL[difficulty] ?? `Nível ${difficulty}`}
    </span>
  );
}

function ItemCard({
  batchId,
  item,
  isNext,
}: {
  batchId: string;
  item: BatchViewItem;
  isNext: boolean;
}) {
  const isDone = item.status === "done";
  const isSkipped = item.status === "skipped";

  return (
    <Card
      className={cn(
        isDone && "opacity-60",
        isNext && "border-2 border-foreground",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isNext ? "default" : "outline"}>#{item.suggestedOrder}</Badge>
            <span className="text-xs text-muted-foreground">
              {MEAL_LABEL[item.mealType]}
            </span>
            {isNext && <Badge variant="secondary">Próximo</Badge>}
          </div>
          <CardTitle className="text-base">
            <Link
              href={`/receita/${item.recipeId}`}
              className={isSkipped ? "line-through text-muted-foreground" : "hover:underline"}
            >
              {item.recipeTitle}
            </Link>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {item.recipeEstimatedMinutes !== null && (
              <span>⏱ {item.recipeEstimatedMinutes} min</span>
            )}
            {item.recipeServings !== null && (
              <span>
                👥 {item.recipeServings}{" "}
                {item.recipeServings === 1 ? "porção" : "porções"}
              </span>
            )}
            {item.recipeDifficulty !== null && (
              <DifficultyDots difficulty={item.recipeDifficulty} />
            )}
          </div>
        </div>
        {item.status !== "pending" && (
          <Badge variant={isDone ? "secondary" : "outline"}>
            {STATUS_LABEL[item.status]}
          </Badge>
        )}
      </CardHeader>
      {item.status === "pending" && (
        <CardContent>
          <BatchItemActions
            batchId={batchId}
            itemId={item.id}
            recipeTitle={item.recipeTitle}
            primary={isNext}
          />
        </CardContent>
      )}
    </Card>
  );
}
