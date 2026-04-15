# pibconfins-site

Dashboard financeiro público da tesouraria da **Primeira Igreja Batista de Confins**, publicado em `amiticia.cc/pibconfins`.

## O que é

Um SPA React que mostra os relatórios financeiros mensais assinados na reunião de contagem. Fonte de dados: arquivos `relatorio_mensal_YYYY-MM.md` em `~/Data/Documents/Finance/Tesouraria-PIB-Confins/`.

## Desenvolvimento

```bash
npm install
npm run build-data      # gera src/data/monthly.json a partir dos .md
npm run dev             # http://localhost:8081/pibconfins/
```

## Fluxo mensal

1. Fechar o mês via `/tesouraria-fechar` (gera `relatorio_mensal_YYYY-MM.md` no repo `Finance`).
2. Neste repo: `npm run build-data`.
3. `git add src/data/monthly.json && git commit -m "data: Mmm/AAAA" && git push`.
4. GitHub Actions builda imagem → ghcr.io → SSH na Hostinger → `docker compose pull && up -d` (~2 min).

## Deploy

- **Imagem**: `ghcr.io/eusoubrasileiro/pibconfins-site:latest`
- **Host**: Hostinger VPS, container em `/root/pibconfins/`
- **Traefik**: `PathPrefix(/pibconfins)` em `Host(amiticia.cc)`, TLS via `myresolver`
- **Prefix routing**: Vite `base: "/pibconfins/"` + `<BrowserRouter basename="/pibconfins">` (sem StripPrefix no Traefik)

Secrets necessários no repo GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (mesmos do `amiticia-site`).

## Validação

O script `build_data.py` valida, mês a mês, que a soma das linhas individuais bate com o TOTAL manuscrito (membros, não membros, ofertas). Qualquer discrepância gera um flag que o dashboard exibe como "⚠ com ressalva".
