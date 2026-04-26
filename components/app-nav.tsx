import Link from "next/link";

const links = [
  { href: "/", label: "Hoje" },
  { href: "/modulos", label: "Modulos" },
  { href: "/historico", label: "Historico" },
] as const;

export function AppNav() {
  return (
    <nav className="border-b">
      <div className="max-w-2xl mx-auto px-4 py-3 flex gap-4 text-sm">
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
