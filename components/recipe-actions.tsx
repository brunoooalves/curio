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
  completeRecipe,
  rejectRecipe,
  revertRecipe,
} from "@/app/actions/practiceActions";
import type { RecipeStatus } from "@/lib/domain/recipe/types";

export function RecipeActions({
  recipeId,
  status,
}: {
  recipeId: string;
  status: RecipeStatus;
}) {
  if (status === "sugerida") {
    return <SuggestedActions recipeId={recipeId} />;
  }
  if (status === "feita") {
    return <DoneActions recipeId={recipeId} />;
  }
  return <RejectedActions recipeId={recipeId} />;
}

function SuggestedActions({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);
  const [reflection, setReflection] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submitCompletion() {
    setError(null);
    startTransition(async () => {
      try {
        await completeRecipe(recipeId, reflection);
        setOpen(false);
        setReflection("");
      } catch (err) {
        setError((err as Error).message ?? "Erro ao concluir.");
      }
    });
  }

  function submitRejection() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectRecipe(recipeId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao rejeitar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={() => setOpen(true)}
          disabled={pending}
        >
          Marcar como feita
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="flex-1"
          onClick={submitRejection}
          disabled={pending}
        >
          Rejeitar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir receita</DialogTitle>
            <DialogDescription>
              Registre uma reflexão curta. Opcional, mas ajuda no aprendizado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reflection">Reflexão</Label>
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
            <Button type="button" onClick={submitCompletion} disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DoneActions({ recipeId }: { recipeId: string }) {
  return <RevertButton recipeId={recipeId} hint="Concluída" />;
}

function RejectedActions({ recipeId }: { recipeId: string }) {
  return <RevertButton recipeId={recipeId} hint="Rejeitada" />;
}

function RevertButton({ recipeId, hint }: { recipeId: string; hint: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await revertRecipe(recipeId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao reverter.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{hint}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClick}
          disabled={pending}
        >
          {pending ? "Revertendo..." : "Reverter"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
