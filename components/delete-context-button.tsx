"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteContextAction } from "@/app/actions/contextActions";

export function DeleteContextButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Excluir contexto "${name}"?`);
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteContextAction(id);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao excluir.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Excluindo..." : "Excluir"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
