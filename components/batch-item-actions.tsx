"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markBatchItemDone,
  replaceBatchItemRecipe,
  skipBatchItem,
} from "@/app/actions/batchActions";

export function BatchItemActions({
  batchId,
  itemId,
  recipeTitle,
}: {
  batchId: string;
  itemId: string;
  recipeTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [reflection, setReflection] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submitDone() {
    setError(null);
    startTransition(async () => {
      try {
        await markBatchItemDone(batchId, itemId, reflection);
        setOpen(false);
        setReflection("");
      } catch (err) {
        setError((err as Error).message ?? "Erro ao marcar feito.");
      }
    });
  }

  function handleSkip() {
    setError(null);
    startTransition(async () => {
      try {
        await skipBatchItem(batchId, itemId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao pular.");
      }
    });
  }

  function handleReplace() {
    setError(null);
    startTransition(async () => {
      try {
        await replaceBatchItemRecipe(batchId, itemId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao trocar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setOpen(true)} disabled={pending}>
          Feito
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSkip}
          disabled={pending}
        >
          Pular
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleReplace}
          disabled={pending}
        >
          Trocar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir &ldquo;{recipeTitle}&rdquo;</DialogTitle>
            <DialogDescription>
              Registre uma reflexao curta. Opcional, mas ajuda no aprendizado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reflection">Reflexao</Label>
            <Textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="O que aprendeu? O que deu errado? O que acertou?"
              rows={5}
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submitDone} disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
