import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getPracticeEventRepository,
  getRecipeRepository,
} from "@/lib/persistence/mongo/factories";
import { getHistoryView, type PracticeHistoryItem } from "@/lib/domain/practice/practiceService";
import { formatRelativeTime } from "@/lib/domain/practice/formatRelativeTime";
import type { PracticeEventType } from "@/lib/domain/practice/types";

export const dynamic = "force-dynamic";

type FilterValue = "all" | PracticeEventType;

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "completed", label: "Concluídos" },
  { value: "rejected", label: "Rejeitados" },
  { value: "reverted", label: "Revertidos" },
];

const TYPE_LABEL: Record<PracticeEventType, string> = {
  completed: "Concluído",
  rejected: "Rejeitado",
  reverted: "Revertido",
};

const TYPE_VARIANT: Record<
  PracticeEventType,
  "default" | "secondary" | "outline" | "destructive"
> = {
  completed: "default",
  rejected: "destructive",
  reverted: "outline",
};

const MEAL_LABEL = {
  cafe: "Café da manhã",
  almoco: "Almoço",
  jantar: "Jantar",
  lanche: "Lanche",
} as const;

function parseFilter(value: string | undefined): FilterValue {
  if (value === "completed" || value === "rejected" || value === "reverted") return value;
  return "all";
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter = parseFilter(type);

  const recipeRepo = await getRecipeRepository();
  const eventRepo = await getPracticeEventRepository();
  const items = await getHistoryView(
    recipeRepo,
    eventRepo,
    filter === "all" ? {} : { types: [filter] },
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Tudo que você praticou, em ordem cronológica reversa.
        </p>
      </header>

      <FilterTabs current={filter} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada por aqui ainda. Marque uma receita como feita ou rejeitada para começar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.event.id}>
              <HistoryItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function FilterTabs({ current }: { current: FilterValue }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {FILTER_TABS.map((tab) => {
        const active = tab.value === current;
        const href = tab.value === "all" ? "/historico" : `/historico?type=${tab.value}`;
        return (
          <Link
            key={tab.value}
            href={href}
            className={
              "rounded-full border px-3 py-1 transition-colors " +
              (active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HistoryItem({ item }: { item: PracticeHistoryItem }) {
  const { event, recipe } = item;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">
            {recipe ? (
              <Link href={`/receita/${recipe.id}`} className="hover:underline">
                {recipe.title}
              </Link>
            ) : (
              <span className="text-muted-foreground">(receita removida)</span>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{formatRelativeTime(event.createdAt)}</p>
        </div>
        <Badge variant={TYPE_VARIANT[event.type]}>{TYPE_LABEL[event.type]}</Badge>
      </CardHeader>
      {(event.reflection || recipe) && (
        <CardContent className="flex flex-col gap-2 text-sm">
          {recipe && (
            <p className="text-muted-foreground">{MEAL_LABEL[recipe.mealType]}</p>
          )}
          {event.reflection && <p className="italic">&ldquo;{event.reflection}&rdquo;</p>}
        </CardContent>
      )}
    </Card>
  );
}
