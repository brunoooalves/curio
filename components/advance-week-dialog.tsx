"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeCurrentModule } from "@/app/actions/userActions";

export function AdvanceWeekDialog({
  moduleId,
  weekNumber,
  moduleTitle,
  hasNextModule,
}: {
  moduleId: string;
  weekNumber: number;
  moduleTitle: string;
  hasNextModule: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        await completeCurrentModule(moduleId);
        setOpen(false);
      } catch (err) {
        setError(
          (err as Error).message ?? "Não foi possível concluir o módulo.",
        );
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          {hasNextModule
            ? `Avançar para Semana ${weekNumber + 1} →`
            : "Concluir esta semana"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Você pode revisar &ldquo;{moduleTitle}&rdquo; quando quiser.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasNextModule
                ? `Avançar para Semana ${weekNumber + 1}?`
                : "Concluir esta semana?"}
            </DialogTitle>
            <DialogDescription>
              &ldquo;{moduleTitle}&rdquo; será marcada como concluída.
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>Lote atual permanece — você pode terminar de cozinhar.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✓</span>
              <span>Lista de compras permanece.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>↻</span>
              <span>
                {hasNextModule
                  ? "Próximas sugestões usarão o módulo seguinte."
                  : "Você terminou o currículo. Pode revisar quando quiser."}
              </span>
            </li>
          </ul>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending
                ? "Avançando..."
                : hasNextModule
                  ? "Avançar"
                  : "Concluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
