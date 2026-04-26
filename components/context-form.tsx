"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import {
  createContextAction,
  updateContextAction,
} from "@/app/actions/contextActions";
import type { DietaryContext, DietaryContextInput } from "@/lib/domain/context/types";

export function ContextForm({
  initial,
  mode,
}: {
  initial: DietaryContext | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [restrictions, setRestrictions] = useState<string[]>(initial?.restrictions ?? []);
  const [dislikes, setDislikes] = useState<string[]>(initial?.dislikes ?? []);
  const [preferences, setPreferences] = useState<string[]>(initial?.preferences ?? []);
  const [servingsOverride, setServingsOverride] = useState<string>(
    initial?.servingsOverride != null ? String(initial.servingsOverride) : "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function buildInput(): DietaryContextInput {
    const so = servingsOverride.trim() === "" ? null : Number.parseInt(servingsOverride, 10);
    return {
      name,
      restrictions,
      dislikes,
      preferences,
      servingsOverride: so === null ? null : Number.isFinite(so) ? so : null,
    };
  }

  function submit() {
    setError(null);
    const input = buildInput();
    startTransition(async () => {
      try {
        if (mode === "edit" && initial) {
          await updateContextAction(initial.id, input);
        } else {
          await createContextAction(input);
        }
        router.push("/contextos");
      } catch (err) {
        setError((err as Error).message ?? "Erro ao salvar contexto.");
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do contexto</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Visita Ana e Joao"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Restricoes</Label>
        <TagInput value={restrictions} onChange={setRestrictions} placeholder="Ex: vegetariano" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Aversoes</Label>
        <TagInput value={dislikes} onChange={setDislikes} placeholder="Ex: pimenta" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Preferencias</Label>
        <TagInput value={preferences} onChange={setPreferences} placeholder="Ex: italiana" />
      </div>

      <div className="flex flex-col gap-2 max-w-[200px]">
        <Label htmlFor="so">Porcoes (opcional)</Label>
        <Input
          id="so"
          type="number"
          min={1}
          value={servingsOverride}
          onChange={(e) => setServingsOverride(e.target.value)}
          placeholder="Vazio = usa padrao"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Criar contexto"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}
