import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGastronomiaCurriculum } from "@/lib/domain/curriculum/loadGastronomia";
import { getUserStateRepository } from "@/lib/persistence/mongo/factories";
import { getCurrentState } from "@/lib/domain/user/userService";
import {
  getModuleStatus,
  missingPrerequisites,
  type ModuleStatus,
} from "@/lib/domain/user/progression";
import { SwitchModuleButton } from "@/components/switch-module-button";
import type { Module } from "@/lib/domain/curriculum/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ModuleStatus, string> = {
  completed: "Concluída",
  current: "Atual",
  available: "Disponível",
  locked: "Bloqueada",
};

const STATUS_VARIANT: Record<
  ModuleStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "secondary",
  current: "default",
  available: "outline",
  locked: "outline",
};

export default async function ModulosPage() {
  const curriculum = getGastronomiaCurriculum();
  const repo = await getUserStateRepository();
  const userState = await getCurrentState(repo);

  const ordered = [...curriculum.modules].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/mais" className="text-sm text-muted-foreground hover:underline">
          ← Mais
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Todos os módulos</h1>
        <p className="text-sm text-muted-foreground">{curriculum.title}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {ordered.map((mod) => {
          const status = getModuleStatus(mod, userState, curriculum);
          const missing =
            status === "locked" ? missingPrerequisites(mod, userState, curriculum) : [];
          return (
            <li key={mod.id}>
              <ModuleCard mod={mod} status={status} missing={missing} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function ModuleCard({
  mod,
  status,
  missing,
}: {
  mod: Module;
  status: ModuleStatus;
  missing: Module[];
}) {
  return (
    <Card
      className={cn(
        status === "current" && "border-2 border-foreground",
        status === "locked" && "border-dashed opacity-70",
      )}
    >
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Semana {mod.weekNumber}
            </p>
            <CardTitle className="text-base">{mod.title}</CardTitle>
          </div>
          <Badge variant={STATUS_VARIANT[status]}>
            {status === "locked" && <span aria-hidden className="mr-1">🔒</span>}
            {STATUS_LABEL[status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{mod.description}</p>

        {status === "locked" && missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Pré-requisito{missing.length === 1 ? "" : "s"}:{" "}
            {missing.map((m) => `Semana ${m.weekNumber} — ${m.title}`).join("; ")}.
          </p>
        )}

        {status === "current" && (
          <p className="text-sm">Você está praticando esta semana.</p>
        )}

        {status === "completed" && (
          <SwitchModuleButton moduleId={mod.id} label="Revisar semana" />
        )}

        {status === "available" && (
          <SwitchModuleButton moduleId={mod.id} label="Ir para esta semana" />
        )}
      </CardContent>
    </Card>
  );
}
