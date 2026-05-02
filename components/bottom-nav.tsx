"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

const items: NavItem[] = [
  {
    href: "/",
    label: "Hoje",
    match: (p) => p === "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" />
      </svg>
    ),
  },
  {
    href: "/plano",
    label: "Plano",
    match: (p) => p.startsWith("/plano"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h10M7 13h7" />
      </svg>
    ),
  },
  {
    href: "/lista",
    label: "Lista",
    match: (p) => p.startsWith("/lista"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6h14l-1.5 12a2 2 0 01-2 2h-7a2 2 0 01-2-2L5 6z" />
        <path d="M9 6V4h6v2" />
      </svg>
    ),
  },
  {
    href: "/mercado",
    label: "Mercado",
    match: (p) => p.startsWith("/mercado") || p.startsWith("/notas") || p.startsWith("/precos"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18l-2 12a2 2 0 01-2 2H7a2 2 0 01-2-2L3 7z" />
        <circle cx="9" cy="11" r="1.5" />
        <circle cx="15" cy="11" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/mais",
    label: "Mais",
    match: (p) =>
      p.startsWith("/mais") ||
      p.startsWith("/modulos") ||
      p.startsWith("/historico") ||
      p.startsWith("/lotes") ||
      p.startsWith("/perfil") ||
      p.startsWith("/contextos") ||
      p.startsWith("/receita") ||
      p.startsWith("/receitas") ||
      p.startsWith("/simular"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="size-6" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
