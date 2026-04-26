"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  applyAsBatchAction,
  previewShoppingListAction,
} from "@/app/actions/shoppingActions";
import { formatQuantity } from "@/lib/domain/shopping/formatQuantity";
import type { Recipe } from "@/lib/domain/recipe/types";
import type { ShoppingLine } from "@/lib/domain/shopping/aggregate";

interface RecipeOption {
  id: string;
  title: string;
  mealType: Recipe["mealType"];
  difficulty: number;
  estimatedMinutes: number;
}

const MEAL_LABEL: Record<Recipe["mealType"], string> = {
  cafe: "Cafe da manha",
  almoco: "Almoco",
  jantar: "Jantar",
  lanche: "Lanche",
};

export function SandboxView({
  recipes,
  initialSelection,
}: {
  recipes: RecipeOption[];
  initialSelection: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));
  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState<"all" | Recipe["mealType"]>("all");
  const [preview, setPreview] = useState<ShoppingLine[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applying, startApplying] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (mealFilter !== "all" && r.mealType !== mealFilter) return false;
      if (term && !r.title.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [recipes, search, mealFilter]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setPreview([]);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await previewShoppingListAction(selectedIds);
        if (!cancelled) {
          setPreview(result);
          setPreviewError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError((err as Error).message ?? "Erro ao calcular lista.");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [selectedIds]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  function applyAsBatchClick() {
    setApplyError(null);
    startApplying(async () => {
      try {
        await applyAsBatchAction(selectedIds);
      } catch (err) {
        const message = (err as Error).message ?? "Erro ao aplicar lote.";
        if (!message.includes("NEXT_REDIRECT")) setApplyError(message);
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Receitas ({filtered.length})</h2>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {(["all", "cafe", "almoco", "jantar", "lanche"] as const).map((mt) => (
              <Button
                key={mt}
                type="button"
                size="sm"
                variant={mealFilter === mt ? "default" : "outline"}
                onClick={() => setMealFilter(mt)}
              >
                {mt === "all" ? "Todas" : MEAL_LABEL[mt]}
              </Button>
            ))}
          </div>
        </div>
        <ul className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-accent/30">
                <Checkbox
                  checked={selected.has(recipe.id)}
                  onCheckedChange={() => toggle(recipe.id)}
                />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium truncate">{recipe.title}</span>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{MEAL_LABEL[recipe.mealType]}</span>
                    <span>· dif. {recipe.difficulty}</span>
                    <span>· ~{recipe.estimatedMinutes} min</span>
                  </div>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          Resultado ({selectedIds.length} receitas → {preview?.length ?? 0} itens)
        </h2>
        {previewLoading && (
          <p className="text-sm text-muted-foreground">Calculando...</p>
        )}
        {previewError && <p className="text-sm text-destructive">{previewError}</p>}
        {!previewLoading && preview !== null && preview.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Selecione receitas para ver a lista.
          </p>
        )}
        {preview && preview.length > 0 && (
          <ul className="flex flex-col">
            {preview.map((line) => (
              <li
                key={line.canonicalName}
                className="flex justify-between gap-4 py-2 border-b text-sm"
              >
                <span className="font-medium">{line.canonicalName}</span>
                <span className="text-muted-foreground">
                  {formatQuantity(line.aggregatedQuantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={applyAsBatchClick}
            disabled={applying || selectedIds.length === 0}
          >
            {applying ? "Aplicando..." : "Aplicar como lote"}
          </Button>
          <Button type="button" variant="ghost" onClick={clear} disabled={selected.size === 0}>
            Limpar
          </Button>
        </div>
        {applyError && <p className="text-sm text-destructive">{applyError}</p>}

        <PreselectFromBatchHint />
      </section>
    </div>
  );
}

function PreselectFromBatchHint() {
  return null;
}
