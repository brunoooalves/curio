# Curio

App de aprendizado baseado em grade curricular. Primeiro domínio: gastronomia. Mobile-first / PWA.

Veja [`CLAUDE.md`](./CLAUDE.md) para visão completa, princípios arquiteturais e convenções.

## Pré-requisitos

- Node.js 20+
- Conta no MongoDB Atlas (free tier serve)
- Chave da API do provedor LLM (OpenAI por default, ou Anthropic)

## MongoDB

Duas opções — escolha uma e copie o `MONGODB_URI` correspondente para `.env.local`.

### Opção 1: Docker local (recomendado para dev)

```bash
docker compose up -d
```

Sobe um Mongo 7 em `localhost:27017` com usuário `curio` / senha `curio` e volume nomeado para persistir os dados. Connection string:

```
MONGODB_URI=mongodb://curio:curio@localhost:27017/curio?authSource=admin
```

Para parar: `docker compose down`. Para zerar tudo (apaga o volume): `docker compose down -v`.

### Opção 2: MongoDB Atlas (free tier)

1. Crie conta em https://www.mongodb.com/cloud/atlas/register
2. Crie um cluster **M0 (free)**.
3. Em **Database Access**, crie um usuário com senha.
4. Em **Network Access**, libere seu IP (ou `0.0.0.0/0` em dev).
5. **Connect → Drivers**, copie a connection string `mongodb+srv://...` e coloque em `MONGODB_URI`.

## Setup

```bash
cp .env.example .env.local
# preencha ANTHROPIC_API_KEY e MONGODB_URI
npm install
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Script              | O quê                                       |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | dev server                                  |
| `npm run build`     | build de produção                           |
| `npm start`         | serve build de produção                     |
| `npm run lint`      | ESLint                                      |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm test`          | Vitest (uma rodada)                         |
| `npm run test:watch`| Vitest em watch                             |
| `npm run test:ui`   | Vitest UI                                   |
| `npm run format`    | Prettier (escreve)                          |

## Variáveis de ambiente

Veja `.env.example`. Resumo:

- `LLM_PROVIDER` — `openai` (default) ou `anthropic`.
- `OPENAI_API_KEY` — necessário se `LLM_PROVIDER=openai`.
- `ANTHROPIC_API_KEY` — necessário se `LLM_PROVIDER=anthropic`.
- `MONGODB_URI` — connection string do Atlas.
- `MONGODB_DB_NAME` — nome do banco (default `curio`).
