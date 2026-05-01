import Link from "next/link";
import { listContexts } from "@/lib/domain/context/contextService";
import { getCurrentState } from "@/lib/domain/user/userService";
import {
  getBatchRepository,
  getDietaryContextRepository,
  getRecipeRepository,
  getUserStateRepository,
} from "@/lib/persistence/mongo/factories";
import { NewBatchForm } from "@/components/new-batch-form";
import { SandboxView } from "@/components/sandbox-view";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/domain/recipe/types";

export const dynamic = "force-dynamic";

type Mode = "rapido" | "avancado";

function parseMode(value: string | undefined): Mode {
  return value === "avancado" ? "avancado" : "rapido";
}

interface RecipeOption {
  id: string;
  title: string;
  mealType: Recipe["mealType"];
  difficulty: number;
  estimatedMinutes: number;
}

function toOption(recipe: Recipe): RecipeOption {
  return {
    id: recipe.id,
    title: recipe.title,
    mealType: recipe.mealType,
    difficulty: recipe.difficulty,
    estimatedMinutes: recipe.estimatedMinutes,
  };
}

export default async function NovoLotePage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; fromBatch?: string }>;
}) {
  const { modo, fromBatch } = await searchParams;
  const mode = parseMode(modo);

  const userRepo = await getUserStateRepository();
  const ctxRepo = await getDietaryContextRepository();
  const [state, contexts] = await Promise.all([
    getCurrentState(userRepo),
    listContexts(ctxRepo),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <Link href="/lote" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-3xl font-semibold leading-tight">Novo lote</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "avancado"
            ? "Escolha receitas manualmente e veja a lista de compras antes de aplicar."
            : "Diga quantas refeições de cada tipo. O app sugere uma ordem; você cozinha como quiser."}
        </p>
      </header>

      <ModeTabs current={mode} fromBatch={fromBatch} />

      {mode === "rapido" ? (
        <NewBatchForm profile={state.profile} contexts={contexts} />
      ) : (
        <AdvancedMode fromBatch={fromBatch} />
      )}
    </main>
  );
}

function ModeTabs({
  current,
  fromBatch,
}: {
  current: Mode;
  fromBatch: string | undefined;
}) {
  const items: { mode: Mode; label: string; hint: string }[] = [
    { mode: "rapido", label: "Rápido", hint: "Conta por tipo" },
    { mode: "avancado", label: "Avançado", hint: "Escolher receitas" },
  ];

  return (
    <nav className="grid grid-cols-2 rounded-lg border bg-background p-1">
      {items.map((item) => {
        const active = current === item.mode;
        const params = new URLSearchParams();
        if (item.mode === "avancado") params.set("modo", "avancado");
        if (fromBatch) params.set("fromBatch", fromBatch);
        const query = params.toString();
        const href = `/lote/novo${query ? `?${query}` : ""}`;
        return (
          <Link
            key={item.mode}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center h-12 rounded-md font-medium transition-colors text-sm",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                "text-[11px] font-normal",
                active ? "text-background/70" : "text-muted-foreground",
              )}
            >
              {item.hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

async function AdvancedMode({ fromBatch }: { fromBatch: string | undefined }) {
  const recipeRepo = await getRecipeRepository();
  const userRepo = await getUserStateRepository();
  const batchRepo = await getBatchRepository();
  const state = await getCurrentState(userRepo);

  const moduleIds = Array.from(
    new Set([state.currentModuleId, ...state.completedModuleIds]),
  );

  const recipes: Recipe[] = [];
  for (const moduleId of moduleIds) {
    const list = await recipeRepo.findByModuleId(moduleId, {
      excludeStatuses: ["rejeitada"],
    });
    recipes.push(...list);
  }

  let initialSelection: string[] = [];
  if (fromBatch) {
    const batch = await batchRepo.findById(fromBatch);
    if (batch) {
      initialSelection = batch.items
        .filter((i) => i.status === "pending")
        .map((i) => i.recipeId);
    }
  }

  return (
    <SandboxView
      recipes={recipes.map(toOption)}
      initialSelection={initialSelection}
    />
  );
}
