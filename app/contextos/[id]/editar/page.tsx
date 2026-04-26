import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/domain/context/contextService";
import { getDietaryContextRepository } from "@/lib/persistence/mongo/factories";
import { ContextForm } from "@/components/context-form";

export const dynamic = "force-dynamic";

export default async function EditarContextoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = await getDietaryContextRepository();
  const ctx = await getContext(repo, id);
  if (!ctx) notFound();

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/contextos" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Editar contexto</h1>
      </header>
      <ContextForm initial={ctx} mode="edit" />
    </main>
  );
}
