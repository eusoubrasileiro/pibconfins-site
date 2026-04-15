# CLAUDE.md — pibconfins-site

Contexto para o Claude Code ao trabalhar neste repositório.

## O que é

Dashboard financeiro público da **Primeira Igreja Batista de Confins** (PIB Confins), onde André é tesoureiro. Publicado em `https://amiticia.cc/pibconfins`. SPA Vite + React + TypeScript + Tailwind, servido por um container Docker independente atrás do Traefik na VPS Hostinger.

## Arquitetura ponta a ponta

```
┌────────────────────────────────────────────────────────────────────┐
│  ~/Data/Documents/Finance/Tesouraria-PIB-Confins/                  │
│    (repo Finance; git tracked; NÃO é este repo)                    │
│    ├── 2026-01-janeiro/relatorio_mensal_2026-01.md  ← ground truth │
│    ├── 2026-02-fevereiro/relatorio_mensal_2026-02.md               │
│    ├── 2026-03-marco/relatorio_mensal_2026-03.md                   │
│    ├── contribuintes.csv, dizimos-historico.csv, ...               │
│    └── Tesouraria <Mes>.pdf         ← PDFs assinados (originais)   │
└──────────────────┬─────────────────────────────────────────────────┘
                   │ npm run build-data
                   ▼
┌────────────────────────────────────────────────────────────────────┐
│  ~/Projects/amiticia/repositories/pibconfins-site/  (ESTE repo)    │
│    scripts/build_data.py  ← parseia os .md, valida totais          │
│    src/data/monthly.json  ← gerado; committed                      │
│    src/pages/Home.tsx, MonthDetail.tsx  ← SPA                      │
└──────────────────┬─────────────────────────────────────────────────┘
                   │ git push main → GitHub Actions
                   ▼
┌────────────────────────────────────────────────────────────────────┐
│  ghcr.io/eusoubrasileiro/pibconfins-site:latest                    │
│  (imagem Docker: nginx servindo dist/ em /pibconfins/ na :3000)    │
└──────────────────┬─────────────────────────────────────────────────┘
                   │ ssh → docker compose pull && up -d
                   ▼
┌────────────────────────────────────────────────────────────────────┐
│  Hostinger VPS 69.62.103.190                                       │
│    /root/pibconfins/docker-compose.yml  ← compose de deploy        │
│    Traefik v3: Host(amiticia.cc) && PathPrefix(/pibconfins)        │
│    https://amiticia.cc/pibconfins  ← público, TLS via Let's Encrypt │
└────────────────────────────────────────────────────────────────────┘
```

## Fonte de dados (crítico)

**O ground truth de cada mês é o PDF manuscrito assinado** na reunião mensal de contagem, arquivado como `Tesouraria <Mês>.pdf` ou `relatorio_assinado_<ano-mês>.pdf` no repo Finance.

A versão digital é o `relatorio_mensal_YYYY-MM.md` dentro de `<ano-mês-nome>/`, transcrito manualmente do PDF e **validado via checksum**: a soma das linhas individuais (membros, não membros, ofertas, saídas) precisa bater com o TOTAL manuscrito de cada bloco. Se não bater, a transcrição tem que ser revisada — não o dashboard.

O script `scripts/build_data.py` re-executa essa validação a cada build e emite um objeto `validacao` por mês em `src/data/monthly.json`:

- `status: "ok"` → dashboard exibe badge verde "✓ totais conferem com o relatório assinado".
- `status: "flagged"` → badge amarela "⚠ com ressalva", com detalhes dos deltas.

## Repositório Finance (leitura/referência)

Este repo depende do layout de `~/Data/Documents/Finance/Tesouraria-PIB-Confins/`. Arquivos relevantes (NÃO mexer neles daqui — só ler):

| Caminho (dentro do Finance) | Propósito |
|---|---|
| `CLAUDE.md` | Contexto geral da tesouraria + fluxo `/tesouraria-sync` e `/tesouraria-fechar`. |
| `*/relatorio_mensal_*.md` | **Input** do `build_data.py`. Estrutura estável (ver Mar/2026 como referência). |
| `contribuintes.csv` | Roster canônico de membros e não-membros + CPFs mascarados. |
| `dizimos-historico.csv` | Log append-only de toda contribuição (usado pelo sync, não por este dashboard). |
| `despesas-recorrentes.md` | Categorias fixas mensais (Copasa, CEMIG, Sustento, Zeladoria, Plano Coop). |
| `Tesouraria <Mês>.pdf` | PDF assinado — fonte primária para transcrição do `.md`. |

Skills `/tesouraria-sync` e `/tesouraria-fechar` (no Finance) produzem os `.md` mensais. Este repo só consome.

## Fluxo mensal (para o agent que vier)

Depois de fechar um mês novo (ex.: Abr/2026 é fechado via `/tesouraria-fechar` no Finance):

```bash
cd ~/Projects/amiticia/repositories/pibconfins-site
npm install                       # se ambiente novo
npm run build-data                # lê todos os .md, valida, escreve src/data/monthly.json
npm run build                     # sanity check TS + bundle
git add src/data/monthly.json
git commit -m "data: Abr/2026"
git push origin main
# GHA: build (~90s) → deploy (~15s). Site atualiza em ~2 min.
```

Se `build-data` reportar `⚠ FLAGGED`, parar e investigar a `.md` antes de publicar — o dashboard vai mostrar ressalva pública senão.

## Stack (para edições)

- **Vite 5** (`base: "/pibconfins/"` em `vite.config.ts` — NÃO remover)
- **React 18 + React Router 6** (`<BrowserRouter basename="/pibconfins">` — casado com o base do Vite)
- **Tailwind CSS** + primitives shadcn-style inline em `src/components/ui/` (card, button, badge, table) — não depende do shadcn CLI
- **Recharts** para o gráfico de tendência
- **TypeScript estrito** (`noUnusedLocals`, `noUnusedParameters`)

## Deploy

Veja o README para overview. Detalhes operacionais:

- **GHA**: `.github/workflows/deploy.yml` → build → `ghcr.io/eusoubrasileiro/pibconfins-site:latest` → SSH → `docker compose pull && up -d`.
- **Secrets**: `SSH_HOST` (69.62.103.190), `SSH_USER` (root), `SSH_KEY` (ed25519 dedicada — par em `~/.ssh/pibconfins_deploy` local, pública já em `~root/.ssh/authorized_keys` na VPS).
- **Compose na VPS**: `/root/pibconfins/docker-compose.yml`. Labels Traefik completas (PathPrefix + redirect HTTP→HTTPS + healthcheck). **Nenhuma mudança necessária no `amiticia-site`** — Traefik v3 prioriza o router com path mais específico.
- **Roll back**: editar tag da imagem em `/root/pibconfins/docker-compose.yml` para `:sha-<short>` de um commit anterior e rodar `docker compose pull && up -d`.

## Gotchas

- **`base` + `basename` devem casar**. Se mudar um, mudar o outro. `index.html` também referencia `/pibconfins/favicon.svg` absoluto.
- **Sem StripPrefix no Traefik**. A app "sabe" do prefix `/pibconfins/` via Vite `base`. Trocar para StripPrefix exigiria remover o `base` e o `basename`.
- **`npm run build-data` precisa do Finance local**. O script procura em `~/Data/Documents/Finance/Tesouraria-PIB-Confins` por padrão. Passe `--source` para override.
- **Dados públicos com nomes completos**. O link é "semi-privado" (compartilhado manualmente), mas a URL é pública. Se nomes precisarem ocultar no futuro, aplicar mascaramento dentro de `build_data.py` — NÃO passar nomes ao componente e filtrar no React (vazamento no JSON bundled).
- **Chart warnings de React Router v7**: inofensivos. Podem ser silenciados adicionando `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` no `<BrowserRouter>`.

## Testes rápidos (verificação end-to-end)

```bash
# Local
npm run dev                                    # http://localhost:8081/pibconfins/
npm run build-data -- --check                  # valida todos os .md sem escrever JSON

# Produção
curl -I https://amiticia.cc/pibconfins/        # 200
curl -I http://amiticia.cc/pibconfins          # 301/308 → https
curl -I https://amiticia.cc/                   # 200 (amiticia-site intacto)
curl -I https://amiticia.cc/pibconfins/mes/2026-03   # 200 (SPA fallback funciona em deep link)
```

## Parent Context

Irmão dentro do monorepo ~/Projects/amiticia/repositories/:

- `amiticia-site` — landing page `amiticia.cc/`. É outro SPA, em outro container, outro repo. Não são acoplados.
- Ver `~/Projects/amiticia/repositories/amiticia-site/CLAUDE.md` para padrão de co-hospedagem em paths de `amiticia.cc` via Traefik.
