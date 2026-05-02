"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/tag-input";
import { createBatchAction } from "@/app/actions/batchActions";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import type { UserProfile } from "@/lib/domain/user/types";
import type { DietaryContext } from "@/lib/domain/context/types";
import type { MealsByType } from "@/lib/domain/batch/types";

const NONE = "__none__";

const MEAL_LABEL: Record<keyof MealsByType, string> = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  lanche: "Lanche",
};

export function NewBatchForm({
  profile,
  contexts,
}: {
  profile: UserProfile;
  contexts: DietaryContext[];
}) {
  const [meals, setMeals] = useState<MealsByType>({
    cafe: 0,
    almoco: 4,
    jantar: 4,
    lanche: 0,
  });
  const [contextId, setContextId] = useState<string>(NONE);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [servings, setServings] = useState<string>("");
  const [saveAs, setSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = meals.cafe + meals.almoco + meals.jantar + meals.lanche;

  const selectedContext = useMemo(
    () => (contextId === NONE ? null : contexts.find((c) => c.id === contextId) ?? null),
    [contextId, contexts],
  );

  const preview = useMemo(() => {
    const servingsNum = servings.trim() === "" ? null : Number.parseInt(servings, 10);
    return buildGenerationContext(profile, {
      context: selectedContext,
      adHoc: { restrictions, dislikes, preferences },
      servings: Number.isFinite(servingsNum ?? Number.NaN) ? servingsNum : null,
    });
  }, [profile, selectedContext, restrictions, dislikes, preferences, servings]);

  const hasAdHocTags =
    restrictions.length > 0 || dislikes.length > 0 || preferences.length > 0;

  function updateMeal(key: keyof MealsByType, value: number) {
    setMeals((m) => ({ ...m, [key]: Math.max(0, Number.isFinite(value) ? value : 0) }));
  }

  function submit() {
    setError(null);
    if (total <= 0) {
      setError("Adicione pelo menos uma refeição.");
      return;
    }
    const servingsNum = servings.trim() === "" ? null : Number.parseInt(servings, 10);
    startTransition(async () => {
      try {
        await createBatchAction({
          mealsByType: meals,
          contextId: contextId === NONE ? null : contextId,
          adHoc: { restrictions, dislikes, preferences },
          servings: Number.isFinite(servingsNum ?? Number.NaN) ? servingsNum : null,
          saveAs:
            saveAs && saveAsName.trim() !== "" && hasAdHocTags
              ? { name: saveAsName.trim() }
              : null,
        });
      } catch (err) {
        const message = (err as Error).message ?? "Erro ao criar plano.";
        if (!message.includes("NEXT_REDIRECT")) {
          setError(message);
        }
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Refeições</h2>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(MEAL_LABEL) as Array<keyof MealsByType>).map((key) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{MEAL_LABEL[key]}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min={0}
                  value={meals[key]}
                  onChange={(e) => updateMeal(key, Number.parseInt(e.target.value, 10) || 0)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Total: {total} {total === 1 ? "receita" : "receitas"}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Contexto</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ctxsel">Contexto salvo</Label>
          <select
            id="ctxsel"
            value={contextId}
            onChange={(e) => setContextId(e.target.value)}
            className="border rounded-md h-11 px-3 text-sm bg-transparent"
          >
            <option value={NONE}>Nenhum</option>
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Restrições adicionais</Label>
          <TagInput value={restrictions} onChange={setRestrictions} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Aversões adicionais</Label>
          <TagInput value={dislikes} onChange={setDislikes} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Preferências adicionais</Label>
          <TagInput value={preferences} onChange={setPreferences} />
        </div>

        <div className="flex flex-col gap-2 max-w-[200px]">
          <Label htmlFor="srv">Porções</Label>
          <Input
            id="srv"
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder={`Padrão: ${profile.servingsDefault}`}
          />
        </div>

        {hasAdHocTags && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={saveAs} onCheckedChange={(v) => setSaveAs(v === true)} />
              Salvar como contexto reutilizável
            </label>
            {saveAs && (
              <Input
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Nome do contexto"
              />
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t pt-4">
        <p className="text-sm">
          Vai gerar respeitando: {preview.restrictions.length}{" "}
          {preview.restrictions.length === 1 ? "restrição" : "restrições"},{" "}
          {preview.dislikes.length}{" "}
          {preview.dislikes.length === 1 ? "aversão" : "aversões"},{" "}
          {preview.preferences.length}{" "}
          {preview.preferences.length === 1 ? "preferência" : "preferências"};{" "}
          {preview.servings} {preview.servings === 1 ? "porção" : "porções"} por receita.
        </p>
        <p className="text-xs text-muted-foreground">
          Cozinhe quando quiser, na ordem que preferir.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={pending || total <= 0}>
            {pending ? "Criando..." : "Criar plano"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </section>
    </form>
  );
}
