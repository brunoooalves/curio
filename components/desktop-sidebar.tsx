"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  match: (path: string) => boolean;
}

const primary: NavItem[] = [
  { href: "/", label: "Hoje", match: (p) => p === "/" },
  { href: "/plano", label: "Plano", match: (p) => p.startsWith("/plano") },
  { href: "/lista", label: "Lista", match: (p) => p.startsWith("/lista") },
  {
    href: "/mercado",
    label: "Mercado",
    match: (p) =>
      p.startsWith("/mercado") || p.startsWith("/notas") || p.startsWith("/precos"),
  },
];

const secondary: NavItem[] = [
  { href: "/modulos", label: "Módulos", match: (p) => p.startsWith("/modulos") },
  { href: "/historico", label: "Histórico", match: (p) => p.startsWith("/historico") },
  { href: "/planos", label: "Planos anteriores", match: (p) => p === "/planos" },
  { href: "/perfil", label: "Perfil", match: (p) => p.startsWith("/perfil") },
  { href: "/contextos", label: "Contextos", match: (p) => p.startsWith("/contextos") },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center px-3 h-11 rounded-md text-sm transition-colors",
        active
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {item.label}
    </Link>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside
      aria-label="Navegação"
      className="hidden md:flex sticky top-0 h-screen w-56 shrink-0 flex-col gap-1 border-r bg-background/60 px-3 py-6"
    >
      <Link href="/" className="px-3 mb-4 font-semibold serif text-xl tracking-tight">
        Curio
      </Link>
      <nav className="flex flex-col gap-1">
        {primary.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </nav>
      <hr className="my-3 border-border" />
      <p className="px-3 mb-1 text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        Mais
      </p>
      <nav className="flex flex-col gap-1">
        {secondary.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(pathname)} />
        ))}
      </nav>
    </aside>
  );
}
