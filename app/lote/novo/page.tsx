import Link from "next/link";
import { listContexts } from "@/lib/domain/context/contextService";
import { getCurrentState } from "@/lib/domain/user/userService";
import {
  getDietaryContextRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { NewBatchForm } from "@/components/new-batch-form";

export const dynamic = "force-dynamic";

export default async function NovoLotePage() {
  const userRepo = await getUserStateRepository();
  const ctxRepo = await getDietaryContextRepository();
  const [state, contexts] = await Promise.all([
    getCurrentState(userRepo),
    listContexts(ctxRepo),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/lote" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Novo lote</h1>
        <p className="text-sm text-muted-foreground">
          Diga quantas refeicoes de cada tipo. O app sugere uma ordem; voce cozinha como quiser.
        </p>
      </header>
      <NewBatchForm profile={state.profile} contexts={contexts} />
    </main>
  );
}
