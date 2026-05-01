import Link from "next/link";

const links = [
  { href: "/", label: "Hoje" },
  { href: "/lote", label: "Lote" },
  { href: "/lista", label: "Lista" },
  { href: "/simular", label: "Simular" },
  { href: "/notas", label: "Notas" },
  { href: "/precos", label: "Preços" },
  { href: "/lotes", label: "Lotes" },
  { href: "/modulos", label: "Módulos" },
  { href: "/historico", label: "Histórico" },
  { href: "/perfil", label: "Perfil" },
  { href: "/contextos", label: "Contextos" },
] as const;

export function AppNav() {
  return (
    <nav className="border-b">
      <div className="max-w-2xl mx-auto px-4 py-3 flex gap-4 text-sm overflow-x-auto whitespace-nowrap">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
