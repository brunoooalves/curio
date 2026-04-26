"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeCurrentModule } from "@/app/actions/userActions";

export function CompleteModuleButton({ moduleId }: { moduleId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await completeCurrentModule(moduleId);
      } catch (err) {
        setError((err as Error).message ?? "Nao foi possivel concluir o modulo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Concluindo..." : "Concluir esta semana"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
