"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (value.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={placeholder ?? "Digite e pressione Enter"}
        disabled={disabled}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => remove(tag)}
              role="button"
              aria-label={`Remover ${tag}`}
            >
              {tag} <span aria-hidden>×</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
