import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listContexts } from "@/lib/domain/context/contextService";
import { getDietaryContextRepository } from "@/lib/persistence/mongo/factories";
import { DeleteContextButton } from "@/components/delete-context-button";

export const dynamic = "force-dynamic";

export default async function ContextosPage() {
  const repo = await getDietaryContextRepository();
  const contexts = await listContexts(repo);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold leading-tight">Contextos</h1>
          <Link href="/contextos/novo">
            <Button type="button">Novo contexto</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Restricoes/preferencias situacionais reutilizaveis. Aplicadas sob demanda na geracao.
        </p>
      </header>

      {contexts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum contexto salvo. Crie um para reutilizar quando cozinhar para visitas ou ocasioes
          especificas.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {contexts.map((ctx) => {
            const tags = [...ctx.restrictions, ...ctx.preferences].slice(0, 3);
            return (
              <li key={ctx.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <CardTitle className="text-base">{ctx.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Link href={`/contextos/${ctx.id}/editar`}>
                        <Button type="button" variant="ghost" size="sm">
                          Editar
                        </Button>
                      </Link>
                      <DeleteContextButton id={ctx.id} name={ctx.name} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 text-sm">
                    {tags.length === 0 ? (
                      <span className="text-muted-foreground">Sem tags</span>
                    ) : (
                      tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))
                    )}
                    {ctx.servingsOverride != null && (
                      <Badge variant="outline">Porcoes: {ctx.servingsOverride}</Badge>
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
