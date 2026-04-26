import Link from "next/link";
import { ContextForm } from "@/components/context-form";

export const dynamic = "force-dynamic";

export default function NovoContextoPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/contextos" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Novo contexto</h1>
      </header>
      <ContextForm initial={null} mode="create" />
    </main>
  );
}
