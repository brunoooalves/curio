"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/tag-input";
import { saveProfile } from "@/app/actions/profileActions";
import type { UserProfile } from "@/lib/domain/user/types";

export function ProfileForm({ initial }: { initial: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile>(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      try {
        await saveProfile(profile);
        setMessage({ type: "ok", text: "Perfil salvo." });
      } catch (err) {
        setMessage({
          type: "error",
          text: (err as Error).message ?? "Erro ao salvar perfil.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <Field label="Restricoes" hint="Itens que nunca devem aparecer (ex: lactose, gluten).">
        <TagInput
          value={profile.restrictions}
          onChange={(v) => update("restrictions", v)}
          placeholder="Ex: lactose"
        />
      </Field>

      <Field label="Aversoes" hint="Itens que voce prefere evitar mas pode aparecer em pouca quantidade.">
        <TagInput
          value={profile.dislikes}
          onChange={(v) => update("dislikes", v)}
          placeholder="Ex: coentro"
        />
      </Field>

      <Field label="Preferencias" hint="Estilos ou ingredientes que voce prefere.">
        <TagInput
          value={profile.preferences}
          onChange={(v) => update("preferences", v)}
          placeholder="Ex: mediterranea"
        />
      </Field>

      <Field
        label="Ingredientes em abundancia"
        hint="Itens que voce tem em casa e quer aproveitar."
      >
        <TagInput
          value={profile.abundantIngredients}
          onChange={(v) => update("abundantIngredients", v)}
          placeholder="Ex: abobrinha"
        />
      </Field>

      <div className="flex flex-col gap-2 max-w-[160px]">
        <Label htmlFor="servings">Porcoes padrao</Label>
        <Input
          id="servings"
          type="number"
          min={1}
          value={profile.servingsDefault}
          onChange={(e) =>
            update(
              "servingsDefault",
              Math.max(1, Number.parseInt(e.target.value, 10) || 1),
            )
          }
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {message && (
          <p className={message.type === "ok" ? "text-sm" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
