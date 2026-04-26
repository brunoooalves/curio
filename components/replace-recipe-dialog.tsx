"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadReplacementCandidates,
  previewReplacementAction,
} from "@/app/actions/shoppingActions";
import { replaceBatchItemRecipe } from "@/app/actions/batchActions";
import { formatQuantity } from "@/lib/domain/shopping/formatQuantity";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { PreviewReplacementResult } from "@/lib/domain/shopping/sandboxService";

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Cafe da manha",
  almoco: "Almoco",
  jantar: "Jantar",
  lanche: "Lanche",
};

export function ReplaceRecipeDialog({
  batchId,
  itemId,
  open,
  onOpenChange,
}: {
  batchId: string;
  itemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [candidates, setCandidates] = useState<Recipe[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Recipe | null>(null);
  const [preview, setPreview] = useState<PreviewReplacementResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirming, startConfirming] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCandidates(null);
      setChosen(null);
      setPreview(null);
      setPreviewError(null);
      setCandidatesError(null);
      setConfirmError(null);
      return;
    }
    setLoadingCandidates(true);
    loadReplacementCandidates(batchId, itemId)
      .then(setCandidates)
      .catch((err) => setCandidatesError((err as Error).message ?? "Erro."))
      .finally(() => setLoadingCandidates(false));
  }, [open, batchId, itemId]);

  function pick(recipe: Recipe) {
    setChosen(recipe);
    setPreview(null);
    setPreviewLoading(true);
    setPreviewError(null);
    previewReplacementAction(batchId, itemId, recipe.id)
      .then(setPreview)
      .catch((err) => setPreviewError((err as Error).message ?? "Erro ao calcular preview."))
      .finally(() => setPreviewLoading(false));
  }

  function confirm() {
    if (!chosen) return;
    setConfirmError(null);
    startConfirming(async () => {
      try {
        await replaceBatchItemRecipe(batchId, itemId, chosen.id);
        onOpenChange(false);
      } catch (err) {
        setConfirmError((err as Error).message ?? "Erro ao trocar receita.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trocar receita</DialogTitle>
          <DialogDescription>
            Veja como a lista de compras muda antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {!chosen ? (
          <CandidatesList
            loading={loadingCandidates}
            error={candidatesError}
            candidates={candidates}
            onPick={pick}
          />
        ) : (
          <PreviewBlock
            chosen={chosen}
            preview={preview}
            loading={previewLoading}
            error={previewError}
            onBack={() => {
              setChosen(null);
              setPreview(null);
              setPreviewError(null);
            }}
          />
        )}

        {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancelar
          </Button>
          {chosen && (
            <Button type="button" onClick={confirm} disabled={confirming || !preview}>
              {confirming ? "Trocando..." : "Confirmar troca"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidatesList({
  loading,
  error,
  candidates,
  onPick,
}: {
  loading: boolean;
  error: string | null;
  candidates: Recipe[] | null;
  onPick: (recipe: Recipe) => void;
}) {
  if (loading) return <p className="text-sm text-muted-foreground">Carregando candidatas...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!candidates || candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem candidatas livres no modulo atual. Cancele e use a opcao de trocar do lote, que
        gera uma nova receita.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
      {candidates.map((recipe) => (
        <li key={recipe.id}>
          <button
            type="button"
            onClick={() => onPick(recipe)}
            className="w-full text-left p-3 border rounded-md hover:bg-accent/30"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{recipe.title}</span>
              <Badge variant="outline">Dif. {recipe.difficulty}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span>{MEAL_LABEL[recipe.mealType]}</span>
              <span>· ~{recipe.estimatedMinutes} min</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PreviewBlock({
  chosen,
  preview,
  loading,
  error,
  onBack,
}: {
  chosen: Recipe;
  preview: PreviewReplacementResult | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Substituir por
          </p>
          <p className="font-medium">{chosen.title}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Calculando preview...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {preview && <DiffSummary preview={preview} />}
    </div>
  );
}

function DiffSummary({ preview }: { preview: PreviewReplacementResult }) {
  const { diff } = preview;
  const empty =
    diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;

  if (empty) {
    return <p className="text-sm text-muted-foreground">Nenhuma mudanca na lista de compras.</p>;
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {diff.removed.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sai</p>
          <ul className="flex flex-col">
            {diff.removed.map((line) => (
              <li key={line.canonicalName} className="flex justify-between gap-3 py-1">
                <span>{line.canonicalName}</span>
                <span className="text-muted-foreground">
                  {formatQuantity(line.aggregatedQuantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {diff.added.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Entra</p>
          <ul className="flex flex-col">
            {diff.added.map((line) => (
              <li key={line.canonicalName} className="flex justify-between gap-3 py-1">
                <span>{line.canonicalName}</span>
                <span className="text-muted-foreground">
                  {formatQuantity(line.aggregatedQuantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {diff.changed.length > 0 && (
        <section>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Muda</p>
          <ul className="flex flex-col">
            {diff.changed.map(({ before, after }) => (
              <li
                key={before.canonicalName}
                className="flex justify-between gap-3 py-1"
              >
                <span>{before.canonicalName}</span>
                <span className="text-muted-foreground">
                  {formatQuantity(before.aggregatedQuantity)} →{" "}
                  {formatQuantity(after.aggregatedQuantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
