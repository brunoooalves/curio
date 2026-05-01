"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagInput } from "@/components/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { generateMoreRecipes } from "@/app/actions/generateMoreRecipes";
import { buildGenerationContext } from "@/lib/domain/generation/buildGenerationContext";
import type { UserProfile } from "@/lib/domain/user/types";
import type { DietaryContext } from "@/lib/domain/context/types";

interface Props {
  moduleId: string;
  profile: UserProfile;
  contexts: DietaryContext[];
}

const NONE = "__none__";

export function GenerateRecipesDialog({ moduleId, profile, contexts }: Props) {
  const [open, setOpen] = useState(false);
  const [contextId, setContextId] = useState<string>(NONE);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [servings, setServings] = useState<string>("");
  const [saveAs, setSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function reset() {
    setContextId(NONE);
    setRestrictions([]);
    setDislikes([]);
    setPreferences([]);
    setServings("");
    setSaveAs(false);
    setSaveAsName("");
    setError(null);
  }

  function submit() {
    setError(null);
    const servingsNum = servings.trim() === "" ? null : Number.parseInt(servings, 10);
    startTransition(async () => {
      try {
        await generateMoreRecipes({
          moduleId,
          contextId: contextId === NONE ? null : contextId,
          adHoc: { restrictions, dislikes, preferences },
          servings: Number.isFinite(servingsNum ?? Number.NaN) ? servingsNum : null,
          saveAs: saveAs && saveAsName.trim() !== "" ? { name: saveAsName.trim() } : null,
        });
        setOpen(false);
        reset();
      } catch (err) {
        setError((err as Error).message ?? "Erro ao gerar.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        Gerar mais receitas
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar receitas</DialogTitle>
            <DialogDescription>
              Restrições do perfil são sempre aplicadas. Adicione contexto situacional se quiser.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
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

            <p className="text-sm text-muted-foreground">
              Vai gerar respeitando: {preview.restrictions.length}{" "}
              {preview.restrictions.length === 1 ? "restrição" : "restrições"},{" "}
              {preview.dislikes.length}{" "}
              {preview.dislikes.length === 1 ? "aversão" : "aversões"},{" "}
              {preview.preferences.length}{" "}
              {preview.preferences.length === 1 ? "preferência" : "preferências"};{" "}
              {preview.servings} {preview.servings === 1 ? "porção" : "porções"}.
            </p>

            {hasAdHocTags && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={saveAs}
                    onCheckedChange={(v) => setSaveAs(v === true)}
                  />
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

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
