"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/domain/format/money";
import type { PriceStat, PriceTrend } from "@/lib/domain/receipt/priceStats";

const TREND_ICON: Record<PriceTrend, string> = {
  up: "↑",
  down: "↓",
  stable: "—",
  unknown: "?",
};

const TREND_LABEL: Record<PriceTrend, string> = {
  up: "Subindo",
  down: "Caindo",
  stable: "Estavel",
  unknown: "Sem dados",
};

type SortMode = "recent" | "alpha";

export function PricesView({ stats }: { stats: PriceStat[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = stats.filter((s) => s.canonicalName.toLowerCase().includes(term));
    if (sort === "alpha") {
      return [...list].sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
    }
    return [...list].sort((a, b) =>
      a.lastObservation.purchaseDate < b.lastObservation.purchaseDate ? 1 : -1,
    );
  }, [stats, search, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar ingrediente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px]"
        />
        <Button
          type="button"
          variant={sort === "recent" ? "default" : "outline"}
          size="sm"
          onClick={() => setSort("recent")}
        >
          Recentes
        </Button>
        <Button
          type="button"
          variant={sort === "alpha" ? "default" : "outline"}
          size="sm"
          onClick={() => setSort("alpha")}
        >
          A-Z
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada por aqui.</p>
      ) : (
        <ul className="flex flex-col">
          {filtered.map((stat) => (
            <li
              key={stat.canonicalName}
              className="flex items-start justify-between gap-3 py-3 border-b text-sm"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{stat.canonicalName}</span>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{stat.observationCount} obs.</span>
                  <span>· última: {stat.lastObservation.purchaseDate}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
                <span className="font-medium">
                  {stat.lastObservation.unitPrice !== null
                    ? formatCents(stat.lastObservation.unitPrice)
                    : "—"}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {stat.avgUnitPrice !== null && (
                    <span>média {formatCents(Math.round(stat.avgUnitPrice))}</span>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs"
                    title={TREND_LABEL[stat.trend]}
                    aria-label={TREND_LABEL[stat.trend]}
                  >
                    {TREND_ICON[stat.trend]}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
