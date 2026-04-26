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

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ModuleStatus, string> = {
  completed: "Concluido",
  current: "Atual",
  available: "Disponivel",
  locked: "Bloqueado",
};

const STATUS_VARIANT: Record<ModuleStatus, "default" | "secondary" | "outline" | "destructive"> = {
  completed: "secondary",
  current: "default",
  available: "outline",
  locked: "destructive",
};

const STATUS_BORDER: Record<ModuleStatus, string> = {
  completed: "border-muted",
  current: "border-foreground",
  available: "border-border",
  locked: "border-dashed border-muted-foreground/30",
};

export default async function ModulosPage() {
  const curriculum = getGastronomiaCurriculum();
  const repo = await getUserStateRepository();
  const userState = await getCurrentState(repo);

  const ordered = [...curriculum.modules].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Todos os modulos</h1>
        <p className="text-sm text-muted-foreground">
          {curriculum.title}
        </p>
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
  const showSwitch = status === "available" || status === "completed";
  return (
    <Card className={`border-2 ${STATUS_BORDER[status]}`}>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Semana {mod.weekNumber}
            </p>
            <CardTitle className="text-base">{mod.title}</CardTitle>
          </div>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{mod.description}</p>
        {status === "locked" && missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Pre-requisitos pendentes:{" "}
            {missing.map((m) => `Semana ${m.weekNumber} — ${m.title}`).join("; ")}.
          </p>
        )}
        {showSwitch && <SwitchModuleButton moduleId={mod.id} />}
      </CardContent>
    </Card>
  );
}
