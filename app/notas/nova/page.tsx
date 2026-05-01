import Link from "next/link";
import { ReceiptUploadForm } from "@/components/receipt-upload-form";

export const dynamic = "force-dynamic";

export default function NovaNotaPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/notas" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Nova nota</h1>
        <p className="text-sm text-muted-foreground">
          Tire uma foto da nota fiscal ou suba uma imagem. O modelo extrai itens e preços.
        </p>
      </header>
      <ReceiptUploadForm />
    </main>
  );
}
