"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateMoreRecipes } from "@/app/actions/generateMoreRecipes";

export function GenerateMoreButton({ moduleId }: { moduleId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await generateMoreRecipes(moduleId);
      } catch (err) {
        setError((err as Error).message ?? "Erro ao gerar receitas.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        onClick={handleClick}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Gerando..." : "Gerar mais receitas"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
