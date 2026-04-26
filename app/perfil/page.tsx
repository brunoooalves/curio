import Link from "next/link";
import { getUserStateRepository } from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const repo = await getUserStateRepository();
  const state = await getCurrentState(repo);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Restricoes e preferencias permanentes. Sao aplicadas em toda geracao de receitas.
        </p>
      </header>
      <ProfileForm initial={state.profile} />
    </main>
  );
}
