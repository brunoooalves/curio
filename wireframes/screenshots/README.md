# Screenshots — estado atual do app (tag 7.0.0)

Capturados via headless Chrome com a paleta Variante C aplicada (PR7).

## Organização

- **Raiz** — versão desktop (1440×900) com sidebar à esquerda, conteúdo centrado
- **`mobile/`** — versão mobile (390×844, iPhone 14) com bottom nav

## Lista de telas

| # | Tela | URL | Modo do app |
|---|---|---|---|
| 01 | Hoje (com lote ativo) | `/` | aprendizado |
| 02 | Lote em andamento | `/lote` | cozinha |
| 03 | Novo lote — Rápido | `/lote/novo` | aprendizado |
| 04 | Novo lote — Avançado | `/lote/novo?modo=avancado` | aprendizado |
| 05 | Lista de compras | `/lista` | cozinha |
| 06 | Mercado — aba Notas | `/mercado` | aprendizado |
| 07 | Mercado — aba Preços | `/mercado?tab=precos` | aprendizado |
| 08 | Módulos | `/modulos` | aprendizado |
| 09 | Perfil | `/perfil` | aprendizado |
| 10 | Mais | `/mais` | aprendizado |
| 11 | Histórico | `/historico` | aprendizado |
| 12 | Contextos | `/contextos` | aprendizado (só desktop) |
| 13 | Lotes anteriores | `/lotes` | aprendizado (só desktop) |

## Como recapturar

Com o dev server rodando (`npm run dev`), volte ao agente e peça
"recapture os screenshots", ou rode manualmente:

```bash
# Desktop
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless --hide-scrollbars --window-size=1440,900 \
  --screenshot="wireframes/screenshots/01-hoje.png" \
  "http://localhost:3000/"

# Mobile (idem com --window-size=390,844 e pasta mobile/)
```

## Para que servem

- **Histórico visual da identidade**: comparar como ficam as telas em
  cada palette/redesign futuro.
- **Pra alimentar v0.dev / Midjourney**: anexa um print + os tokens
  (ver `app/globals.css`) e itera.
- **Bug reports / regressão visual**: usar como baseline de "como deveria
  estar antes da minha mudança".
