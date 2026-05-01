# Curio

> App de aprendizado baseado em grade curricular. Pegue uma matéria, vire prática deliberada na sua vida.

Curio transforma um currículo real em um loop de prática diária. O primeiro
domínio é **gastronomia**: você está numa "semana" do currículo (cortes,
fundos, molhos-mãe, cocção), o app gera receitas que treinam os conceitos
daquela semana, você forma um lote do que vai cozinhar, leva uma lista de
compras pro mercado, fotografa a nota fiscal, e vai construindo um histórico
de preços ao longo do tempo. A arquitetura é genérica — o mesmo motor pode
servir física, história, administração, qualquer matéria que tenha conceitos
ordenados e atividades práticas.

## A proposta

Curio é um **guia, não uma agenda**. Você cozinha quando quer, no ritmo seu.
Isso aparece em decisões concretas:

- **Sem datas em items**. Não existe "atrasado", "vencido", "deveria ter
  feito hoje". O único estado temporal é "feito" vs "não feito".
- **Ordem sugerida ≠ ordem obrigatória**. Perecíveis primeiro,
  depois dificuldade, depois tempo. Mas você cozinha fora de ordem se quiser.
- **Pular não é falha**. "Pular" um item é gratuito; sem culpa visual,
  sem penalidade.
- **Linguagem da UI** evita pressão temporal: "sugestão", "a fazer",
  "próxima sugestão" — nunca "urgente", "prazo", "pendente há X dias".

A ideia não é otimizar produtividade na cozinha. É construir competência
lentamente, do jeito que você aprenderia num livro de receitas em casa.

## Como funciona

### 1. Currículo
A grade pedagógica vive em YAML versionado (`curriculums/gastronomia.yaml`).
Cada módulo é uma "semana" com conceitos ordenados, descrições e
pré-requisitos. **O currículo nunca é gerado em runtime** — é estrutura
estável e pensada.

### 2. Receitas
Diferente do currículo, receitas **não** são curadas previamente. São
geradas pela Claude/OpenAI sob demanda, alinhadas ao módulo atual,
respeitando perfil e contextos do usuário, e persistidas no MongoDB.
A partir daí ganham id estável e viram ativos do app — abrir o app de
novo mostra as mesmas receitas. Existe ação explícita pra gerar mais.

### 3. Perfil e contextos
- **Perfil permanente**: restrições (nunca aparece), aversões (evitar),
  preferências (estilos), despensa (aproveitar), porções padrão.
- **Contextos situacionais**: ex.: "jantar com Ana e João (vegetariana)" —
  reutilizável, aplicado sob demanda.
- Combinação: profile + contexto + tags ad-hoc são mesclados; restrições
  unem (a mais conservadora vence), preferências combinam.

### 4. Lote (batch)
Você diz quantas refeições de cada tipo (café/almoço/jantar/lanche). O app
seleciona receitas alinhadas ao módulo + revisão de módulos concluídos,
gera o que faltar via LLM (uma chamada só), e persiste o lote com um
**snapshot do contexto de geração** — assim trocas/substituições futuras
são determinísticas. Tem dois modos:

- **Rápido** — você só dá os números e o app decide.
- **Avançado** — você escolhe receitas manualmente e vê o preview da
  lista de compras antes de aplicar.

### 5. Cozinhar
Abre o lote, vê itens em ordem sugerida com tempo, porções e dificuldade.
O próximo item está destacado. Marca **Feito** (com reflexão opcional),
**Pular**, ou **Trocar** (abre dialog mostrando candidatas e o diff de
como a lista de compras muda).

### 6. Lista de compras
Auto-recomputada quando o lote muda (criar, marcar feito, pular, trocar).
Status de cada item (a comprar / comprado / tenho em casa / ignorar) é
preservado entre recálculos via reconciliação por `canonicalName`.

Quantidades são exibidas em **formato híbrido**: a forma mais útil pro
mercado em destaque (`~170 ml · 1 garrafa pequena`), a soma literal das
receitas como nota auditável (`soma de 11 colheres de sopa · em 5 receitas`).

### 7. Mercado
Foto da nota fiscal → vision LLM → itens estruturados + preços
normalizados → persistidos. Os preços alimentam estimativa de custo de
lotes futuros. Histórico de preços é agregado e tem detecção de
tendência (subindo / caindo / estável).

### 8. PWA / offline
Instalável no celular. Leitura funciona offline. Mutações de status em
`/lista` e `/lote` enfileiram em IndexedDB e sincronizam quando volta
conexão. Ações que dependem de LLM (gerar receitas, ler nota) são
explicitamente online-only com controles desabilitados.

## Identidade visual

O app usa a paleta **"Provence linho"** (Variante C, escolhida em
`wireframes/identidade.html`):

- **Bege linho** `#f5f1e8` como base — não branco, não cinza
- **Mármore branco** `#ffffff` nos cards
- **Azul-petróleo escuro** `#1f2a2e` como tinta
- **Sage** `#7c8a78` como acento principal (tags, links secundários)
- **Terracota** `#b15c3d` reservada pra "atual / próximo"

Tipografia: **Fraunces** (variável, serif) nos headings, **Geist Sans**
no corpo. h1 muda entre itálico (modo aprendizado, convida leitura) e
reto (modo cozinha, comunica ação).

### Dois modos automáticos por rota

- **Aprendizado** (default) — leitura, espaço, serif itálico. Aplica em
  todas as rotas exceto execução.
- **Cozinha** — execução. Bg um pouco mais firme, contraste maior,
  serif reto. Aplica em `/lote`, `/lote/[id]`, `/lista`, `/receita/[id]`.

A lógica vive em `components/mode-controller.tsx` que define
`data-mode="learning|cooking"` no `<html>` baseado no `usePathname()`.

## Tecnologia

### Stack

- **Next.js 15+ (App Router)** — Server Components reduzem bundle no
  celular; rotas e route handlers no mesmo repo.
- **TypeScript estrito** — `noImplicitReturns`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`. Sem `any`, sem `// @ts-ignore`.
- **Tailwind CSS v4 + shadcn/ui** — componentes copiados ao repo, sem
  dependência runtime. Tokens em `app/globals.css`.
- **Zustand** — estado client local, leve.
- **React Query** — cache, revalidação e sincronização de dados de
  servidor. Substitui `useEffect` para fetching.
- **MongoDB driver oficial** — sem ODM. Zod já valida; driver dá controle
  total sobre queries e índices.
- **Vercel AI SDK** com providers OpenAI (default) e Anthropic.
  `generateObject` com schema Zod, nunca parsing de texto livre.
- **Zod** em toda fronteira: LLM, YAML, request body, fs, docs do Mongo.
- **Vitest + mongodb-memory-server** — testes rápidos do domínio e dos
  repositories sem depender de Atlas.
- **next-pwa** — instalável.

### Provider de LLM

Granularidade por **tarefa**. Cada chamada usa `getModel(task)` onde
`task ∈ { "recipe_generation", "ingredient_normalization", "receipt_vision" }`.
A tabela `MODELS_BY_PROVIDER` em `lib/llm/provider/config.ts` mapeia
`(provider, task) → modelId`. Trocar de provider é alteração de env
(`LLM_PROVIDER`), nunca de código.

## Arquitetura

### Princípios

1. **Currículo é YAML versionado**. Estrutura pedagógica estável.
2. **Receitas são geradas e persistidas**. Um id estável as transforma
   em ativo do app.
3. **Camada de domínio é TypeScript puro** (`lib/domain/`). Zero
   dependência de Next, React, MongoDB, ou qualquer I/O. Testável
   isoladamente.
4. **Persistência atrás de repositories**. Interfaces em
   `lib/persistence/repositories/`, implementações em
   `lib/persistence/mongo/`. Domínio nunca importa o driver direto.
5. **Mobile-first**. Uso real é no celular, na cozinha e no mercado.
6. **Extensibilidade**. Core (`Curriculum`, `Module`, `Concept`,
   `UserState`, `Practice`) é genérico; detalhes específicos vivem em
   `lib/domain/curriculum/domains/<dominio>/`.

### Convenções

- **IDs são strings (uuid v4)** — não `ObjectId`. Facilita serialização.
- **Repositories expõem tipos do domínio** — `ObjectId`, `WithId<T>`,
  `Document` ficam internos a `lib/persistence/mongo/`.
- **Saídas de LLM via `generateObject`** com schema Zod.
- **Conexão MongoDB é singleton** com cache em `globalThis` em dev
  (sobrevive ao HMR sem reconectar).
- **Server Components por padrão**. `"use client"` só pra interatividade.
- **Não usar `useEffect` pra data fetching**.

### Estrutura de pastas

```
app/                          Rotas Next.js (App Router)
  layout.tsx                  Shell global: BottomNav + Sidebar + ModeController
  page.tsx                    Hoje
  lote/                       Lote ativo + criação (rápido + avançado)
  lista/                      Lista de compras
  mercado/                    Notas + Preços (tabs)
  modulos/                    Currículo completo
  historico/                  Eventos de prática
  perfil/, contextos/         Configuração do usuário
  mais/                       Drawer de seções secundárias
components/                   React (UI)
  ui/                         shadcn (button, card, badge, dialog, etc.)
  bottom-nav.tsx              Mobile (<md)
  desktop-sidebar.tsx         Desktop (≥md)
  mode-controller.tsx         Auto-switch aprendizado/cozinha por rota
  batch-view.tsx              Cards de receita no lote
  shopping-item-row.tsx       Item da lista (display híbrido)
  ...
lib/
  domain/                     TS puro, zero I/O, testável
    curriculum/               Currículo, módulos, conceitos
    recipe/                   Receitas
    user/                     Perfil, progressão, estado
    batch/                    Lotes, seleção, ordem sugerida
    shopping/                 Lista de compras, agregação, hybrid quantities
    receipt/                  Notas fiscais, preços, estatísticas
    practice/                 Eventos de prática (completed/rejected/reverted)
    context/                  Contextos dietéticos
    generation/               Mescla profile + contexto + ad-hoc
    format/                   Helpers de plural, money
  llm/
    provider/                 Provider abstraction (OpenAI / Anthropic)
    prompts/                  Cada prompt em arquivo próprio
    generateRecipes.ts, extractReceipt.ts, normalizeIngredient.ts
  persistence/
    mongo/                    Cliente, conexão singleton, repos
    repositories/             Interfaces (contratos)
  format/plural.ts            Helper de pluralização
curriculums/                  YAMLs versionados
test/                         Vitest, espelhando lib/
wireframes/                   Wireframes de redesign + identidade + screenshots
.github/workflows/            CI (auto-tag em push pra main)
```

## Setup

### Pré-requisitos

- Node.js 20+
- MongoDB (Docker local ou Atlas free tier)
- Chave de API: OpenAI (default) ou Anthropic

### MongoDB — Docker local (recomendado)

```bash
docker compose up -d
```

Sobe Mongo 7 em `localhost:27017` com usuário `curio`/`curio`. Connection
string:

```
MONGODB_URI=mongodb://curio:curio@localhost:27017/curio?authSource=admin
```

Pra parar: `docker compose down`. Pra zerar tudo: `docker compose down -v`.

### MongoDB — Atlas free tier

1. Crie conta em https://www.mongodb.com/cloud/atlas/register
2. Crie cluster M0 (free).
3. **Database Access** — crie usuário com senha.
4. **Network Access** — libere seu IP (ou `0.0.0.0/0` em dev).
5. **Connect → Drivers** — copie a connection string `mongodb+srv://...`.

### Rodar

```bash
cp .env.example .env.local
# preencha OPENAI_API_KEY (ou ANTHROPIC_API_KEY) e MONGODB_URI
npm install
npm run dev
```

http://localhost:3000

## Scripts

| Script              | O quê                            |
| ------------------- | -------------------------------- |
| `npm run dev`       | dev server                       |
| `npm run build`     | build de produção                |
| `npm start`         | serve build de produção          |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm test`          | Vitest (uma rodada)              |
| `npm run test:watch`| Vitest em watch                  |
| `npm run test:ui`   | Vitest UI                        |
| `npm run format`    | Prettier (escreve)               |

## Variáveis de ambiente

Veja `.env.example`. Resumo:

- `LLM_PROVIDER` — `openai` (default) ou `anthropic`.
- `OPENAI_API_KEY` — necessário se `LLM_PROVIDER=openai`.
- `ANTHROPIC_API_KEY` — necessário se `LLM_PROVIDER=anthropic`.
- `MONGODB_URI` — connection string.
- `MONGODB_DB_NAME` — nome do banco (default `curio`).

## Versionamento

Cada push em `main` dispara `.github/workflows/tag-on-push.yml`, que:

1. Pega a tag mais recente no formato `X.Y.Z`.
2. Incrementa o major: `1.0.0` → `2.0.0` → ...
3. Cria e empurra a tag.

Pra rodar uma versão específica: `git checkout 5.0.0`.

Tags principais até hoje:

| Tag    | O quê                                                       |
| ------ | ----------------------------------------------------------- |
| 1.0.0  | Foundation pass: acentos, touch targets, contraste, plurais |
| 2.0.0  | Navegação: bottom nav mobile + sidebar desktop, /mais, /mercado |
| 3.0.0  | Hoje + Lote redesign: state-reactive, cards ricos, advance dialog |
| 4.0.0  | Lista UI cleanup + Módulos com estados visuais distintos    |
| 5.0.0  | Quantidades híbridas (display + raw + packaging)            |
| 6.0.0  | Fundir /simular em /lote/novo + reconciliação Revertido     |
| 7.0.0  | Identidade visual Variante C + Fraunces + auto-mode         |
| 8.0.0  | Screenshots de baseline (desktop + mobile) em wireframes/   |

## Wireframes e referências visuais

- [`wireframes/index.html`](wireframes/index.html) — wireframes do redesign
  completo (11 telas mobile com anotações).
- [`wireframes/decisions.html`](wireframes/decisions.html) — 4 decisões
  de design comparadas lado a lado.
- [`wireframes/identidade.html`](wireframes/identidade.html) — 3 variantes
  de paleta com toggle aprendizado/cozinha.
- [`wireframes/screenshots/`](wireframes/screenshots/) — prints atuais
  (desktop 1440×900 + mobile 390×844) — útil pra alimentar v0.dev e como
  baseline de regressão visual.

## Decisões de design

Quatro decisões deliberadas que moldaram o redesign atual:

1. **Status `Revertido` mantido** como 4º filtro em `/historico`. CLAUDE.md
   reconcilia: `BatchItem.status` tem 3 estados (`pending`/`done`/`skipped`);
   `PracticeEvent.type` tem 4 (`completed`/`rejected`/`reverted`) — o
   "revertido" é evento de auditoria, não estado do item.
2. **/simular fundido** em `/lote/novo?modo=avancado`. Era duplicidade.
   `/simular` agora é redirect.
3. **Quantidades híbridas** na lista de compras: `display` (mercado-friendly)
   + `raw` (soma literal auditável) + `packaging` (sugestão de embalagem).
4. **Sidebar no desktop**, bottom nav no mobile. Aproveita largura sem
   forçar mobile-everywhere.

Detalhes em [`wireframes/decisions.html`](wireframes/decisions.html).

## Princípios complementares

- [`CLAUDE.md`](./CLAUDE.md) — visão completa, princípios arquiteturais,
  convenções, filosofia de uso, e o que não fazer.
- [`AGENTS.md`](./AGENTS.md) — notas para agentes que trabalham no repo
  (atenção a breaking changes em libs, ler docs locais antes de codar).

## O que não fazer

- Gerar grade curricular em runtime (currículo é YAML, ponto).
- Inventar receitas em código — vêm sempre do LLM ou do banco.
- Lógica de negócio dentro de componentes React.
- `fetch` direto no client sem React Query.
- Consumir saída de LLM sem validação Zod.
- Importar `mongodb` fora de `lib/persistence/`.
- Vazar `ObjectId` ou tipos do driver pra fora da camada de persistência.
- Usar `useEffect` para buscar dados.
- Adicionar ODM (Mongoose, Prisma para Mongo, etc.) — a decisão consciente
  é driver + Zod.

## Estado atual

Funcional ponta-a-ponta. Tem:
- Currículo de gastronomia em 4 semanas.
- Geração e persistência de receitas via LLM.
- Lotes com sugestão de ordem, marcação feito/pular/trocar, reordenação.
- Lista de compras auto-recomputada com hybrid quantities.
- Captura de notas fiscais via vision + estatísticas de preços.
- Identidade visual Variante C aplicada com auto-switch entre modos.
- 250 testes Vitest.

Pendências menores conhecidas:
- Toast de undo de 30s para "Avançar para próxima semana" (só o confirm
  está implementado).
- Componente `GenerateRecipesDialog` órfão (a integrar em `/modulos`).
- PWA service worker / outbox queue ainda não implementado.

## Contribuindo

Antes de mexer em algo:

1. Leia [`CLAUDE.md`](./CLAUDE.md) e [`AGENTS.md`](./AGENTS.md).
2. `npm run typecheck && npm test` antes de commitar.
3. Siga o estilo dos commits existentes (`feat(scope): ...`).
4. Cada push em main vira tag `X.0.0` automaticamente — agrupe trabalho
   coerente num push, não múltiplos pequenos.
