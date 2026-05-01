import Link from "next/link";

export const dynamic = "force-dynamic";

interface Section {
  title: string;
  items: { href: string; label: string; hint: string; emoji: string }[];
}

const sections: Section[] = [
  {
    title: "Currículo",
    items: [
      {
        href: "/modulos",
        label: "Módulos",
        hint: "Currículo completo, semanas e pré-requisitos",
        emoji: "📚",
      },
      {
        href: "/historico",
        label: "Histórico",
        hint: "Receitas concluídas, puladas e reflexões",
        emoji: "🗂️",
      },
      {
        href: "/lotes",
        label: "Lotes anteriores",
        hint: "Lotes que você criou",
        emoji: "📦",
      },
    ],
  },
  {
    title: "Você",
    items: [
      {
        href: "/perfil",
        label: "Perfil",
        hint: "Restrições, aversões, preferências, despensa, porções",
        emoji: "👤",
      },
      {
        href: "/contextos",
        label: "Contextos salvos",
        hint: "Restrições/preferências situacionais reutilizáveis",
        emoji: "🎭",
      },
    ],
  },
];

export default function MaisPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight">Mais</h1>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <p className="px-1 text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {section.title}
          </p>
          <ul className="flex flex-col rounded-lg border bg-background overflow-hidden">
            {section.items.map((item, idx) => (
              <li key={item.href} className={idx > 0 ? "border-t" : ""}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xl shrink-0" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
