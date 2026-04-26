# Curio

App de aprendizado baseado em grade curricular. Primeiro domínio: gastronomia. Mobile-first / PWA.

Veja [`CLAUDE.md`](./CLAUDE.md) para visão completa, princípios arquiteturais e convenções.

## Pré-requisitos

- Node.js 20+
- Conta no MongoDB Atlas (free tier serve)
- Chave da API Anthropic

## MongoDB Atlas (free tier)

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

- `ANTHROPIC_API_KEY` — chave da API Anthropic.
- `MONGODB_URI` — connection string do Atlas.
- `MONGODB_DB_NAME` — nome do banco (default `curio`).
