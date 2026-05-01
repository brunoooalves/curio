"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { switchToModule } from "@/app/actions/userActions";

export function SwitchModuleButton({
  moduleId,
  label = "Ir para esta semana",
}: {
  moduleId: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await switchToModule(moduleId);
      } catch (err) {
        setError((err as Error).message ?? "Não foi possível trocar de módulo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending}>
        {pending ? "Trocando..." : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
