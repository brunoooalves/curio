@AGENTS.md

# Curio

App de aprendizado baseado em grade curricular. Primeiro domínio é gastronomia; arquitetura é genérica para qualquer matéria (física, história, administração, etc.).

## Visão (resumida)

- Currículo é uma estrutura pedagógica fixa (módulos, conceitos, ordem, pré-requisitos), versionada em YAML no repo.
- Usuário está em um módulo. O app mostra os conceitos da semana e atividades práticas (no domínio gastronomia: receitas) que exercitam esses conceitos.
- Atividades práticas (receitas) **não** estão no YAML e **não** são curadas previamente. São geradas pela Claude API sob demanda, persistidas no MongoDB com id estável, e reusadas a partir daí.
- Usuário planeja N dias, define quantidade/tipo de prática, restrições, preferências. App seleciona/gera atividades alinhadas ao módulo + revisão.
- Feedback do usuário (feita/rejeitada) ajusta sugestões futuras.
- App gera lista de compras consolidada do plano.
- No mercado, foto da nota fiscal vai pra Claude com vision; itens são extraídos, normalizados e persistidos para estimativa de custo de planos futuros.

## Princípios arquiteturais

1. **Currículo é YAML versionado, estrutura pedagógica estável.** Nunca gerar grade curricular em runtime via LLM.
2. **Receitas (e demais "práticas") são geradas pelo LLM e persistidas no MongoDB.** Uma vez geradas viram ativos do app: id estável, mesmo conteúdo nas próximas aberturas. Existe ação explícita pra gerar mais.
3. **LLM em runtime serve para:** gerar receitas alinhadas a um módulo; adaptar receitas a restrições; OCR de notas fiscais; normalização de itens; explicações sob demanda. Toda saída de LLM é validada com Zod (`generateObject`), nunca parseada de texto livre.
4. **Camada de domínio é TypeScript puro.** `lib/domain/` não depende de Next.js, React, MongoDB, nem de qualquer I/O. Lógica de progressão, planejador e modelos vivem aqui. Testável isoladamente.
5. **Persistência atrás de repositories.** `lib/persistence/repositories/` define interfaces; implementações MongoDB ficam em `lib/persistence/mongo/`. O domínio nunca importa o driver direto.
6. **Mobile-first.** Uso real é no celular, na cozinha e no mercado. PWA instalável.
7. **Extensibilidade.** Gastronomia é o primeiro domínio; o core (`Curriculum`, `Module`, `Concept`, `UserState`, `Practice`) é genérico. Detalhes específicos vivem em `lib/domain/curriculum/domains/<dominio>/`.

## Stack e justificativas

- **Next.js 15+ (App Router)** — Server Components reduzem bundle no celular; rotas e route handlers no mesmo repo.
- **TypeScript estrito** — domínio é o coração; tipos previnem regressão silenciosa.
- **Tailwind + shadcn/ui (tema neutro, base-color: neutral)** — UI mobile-first sem CSS custom; componentes copiados ao repo (sem dependência runtime).
- **Zustand** — estado client local, leve, sem boilerplate.
- **React Query** — cache, revalidação e sincronização de dados de servidor; substitui `useEffect` para fetching.
- **MongoDB driver oficial (`mongodb`)** — sem ODM. Zod já valida; driver oficial dá controle total sobre queries e índices.
- **Atlas free tier** como banco padrão; `MONGODB_URI` no `.env.local`.
- **Vercel AI SDK** com providers **OpenAI (default)** e **Anthropic** — `generateObject` com schema Zod. Provider escolhido via `LLM_PROVIDER` (default `openai`). Modelo "rich" pra geração (gpt-4o / claude-sonnet-4-5) e "light" pra tarefas leves (gpt-4o-mini / claude-haiku-4-5). Provider abstraído em `lib/llm/provider.ts` — features chamam `getRichModel()` / `getLightModel()`, nunca o SDK do provider direto.
- **`yaml`** — parsing dos currículos.
- **Zod** — validação de toda fronteira: LLM, YAML, request body, fs, documentos lidos do Mongo.
- **next-pwa** — instalável no celular.
- **Vitest + mongodb-memory-server** — testes rápidos do domínio e dos repositories sem depender de Atlas.
- **ESLint + Prettier** — consistência sem discussão.

## Convenções de código

- **TypeScript estrito.** Sem `any`. Sem `// @ts-ignore`. `noImplicitReturns`, `noUncheckedIndexedAccess`, `noImplicitOverride` ligados. Non-null assertion (`!`) só com comentário curto justificando.
- **Zod em toda fronteira externa.** LLM, YAML, request body, fs, docs lidos do Mongo: tudo passa por `parse`/`safeParse` antes de virar tipo de domínio.
- **Funções puras** quando possível, especialmente em `lib/domain/`. Side-effects empurrados pra borda.
- **Testes Vitest** co-localizados (`foo.ts` + `foo.test.ts`) ou em `test/` espelhando a estrutura. Testes de repository usam `mongodb-memory-server`.
- **Server Components por padrão.** `"use client"` só para interatividade ou APIs de browser.
- **Não usar `useEffect` para data fetching.** Server Component faz o fetch ou React Query no client.
- **Saídas de LLM via `generateObject`** com schema Zod; nunca parsear texto livre.
- **Modelos vêm de `lib/llm/provider.ts`** (`getRichModel`/`getLightModel`). Não importar `@ai-sdk/openai` ou `@ai-sdk/anthropic` direto em código de feature.
- **Conexão MongoDB é singleton no server**, com cache em `globalThis` em desenvolvimento para sobreviver ao HMR sem reconectar.
- **Repositories expõem tipos do domínio**, nunca tipos do driver Mongo. `ObjectId`, `WithId<T>`, `Document`, etc. ficam internos a `lib/persistence/mongo/`.
- **IDs são strings (uuid v4).** Não `ObjectId`. Facilita serialização para client e desacopla do Mongo.
- **Imports absolutos** via `@/lib/...`, `@/components/...`, `@/test/...`.

## Fluxo de trabalho para adicionar feature

1. **Modelar tipos** em `lib/domain/`.
2. **Definir interface** de repository em `lib/persistence/repositories/`.
3. **Escrever testes Vitest** (mongodb-memory-server para repository).
4. **Implementar lógica pura** no domínio.
5. **Implementar repository** em `lib/persistence/mongo/`.
6. **Adaptadores** (LLM em `lib/llm/`, OCR em `lib/ocr/`) com schemas Zod.
7. **UI por último** — Server Component primeiro; Client só se realmente necessário.

## O que NÃO fazer

- Gerar grade curricular em runtime (currículo é YAML, ponto).
- Inventar receitas em código — vêm sempre do LLM ou do banco.
- Lógica de negócio dentro de componentes React.
- `fetch` direto no client sem React Query.
- Consumir saída de LLM sem validação Zod.
- Importar `mongodb` fora de `lib/persistence/`.
- Vazar `ObjectId` ou tipos do driver para fora da camada de persistência.
- Usar `useEffect` para buscar dados.
- Adicionar ODM (Mongoose, Prisma para Mongo, etc.) — a decisão consciente é driver + Zod.

## Estrutura de pastas

```
app/                          rotas Next.js (App Router)
components/                   componentes React (UI), incluindo shadcn em components/ui
lib/
  utils.ts                    helpers compartilhados (cn, etc.)
  domain/                     TS puro, zero dependência de Next/React/I/O/Mongo
    curriculum/
      domains/                schemas/validações específicas por domínio
    recipe/                   tipos de receita, serviços de domínio
    user/                     UserState, perfil, restrições
    planner/                  gerador de plano semanal
  llm/
    prompts/                  cada prompt em arquivo separado
  ocr/                        adaptador OCR (vision LLM)
  persistence/
    mongo/                    cliente, conexão singleton, implementações de repository
    repositories/             interfaces (contratos) que o domínio consome
  yaml/                       parser de currículo
curriculums/                  YAMLs versionados (gastronomia, futuros domínios)
test/                         testes Vitest, espelhando lib/
```
