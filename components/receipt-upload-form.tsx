"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { ingestReceiptImage } from "@/app/actions/receiptActions";

const MAX_BYTES = 10 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler arquivo."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Resultado inesperado do FileReader."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function ReceiptUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`Imagem muito grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Limite: 10 MB.`);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function submit() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const base64 = await readAsBase64(file);
        await ingestReceiptImage(base64, file.type || "image/jpeg");
      } catch (err) {
        const message = (err as Error).message ?? "Erro ao processar nota.";
        if (!message.includes("NEXT_REDIRECT")) setError(message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="text-sm"
      />
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Pre-visualizacao da nota"
          className="max-h-[60vh] rounded-md border"
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={submit} disabled={!file || pending}>
          {pending ? "Processando..." : "Processar"}
        </Button>
        {pending && (
          <p className="text-xs text-muted-foreground">
            Enviando imagem ao modelo. Pode demorar alguns segundos.
          </p>
        )}
      </div>
    </div>
  );
}
