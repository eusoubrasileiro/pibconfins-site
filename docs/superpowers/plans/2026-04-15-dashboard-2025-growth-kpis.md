# PIB Confins Dashboard — 2025 history + Growth KPIs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest Pastor Luis's 2025 consolidated spreadsheet into the existing monthly format and extend the dashboard with growth KPIs (active contributors/month, retention, YoY comparison, accumulated balance, category donuts).

**Architecture:** One-shot Python script reads the 12 monthly sheets of the xlsx and writes `relatorio_mensal_2025-MM.md` files in the same template used by `/tesouraria-fechar`, so `build_data.py` picks them up with zero changes. Dashboard gains a `src/lib/metrics.ts` module with pure derivation functions, 6 new React components, and a restructured Home page with year-grouped month cards.

**Tech Stack:** Python 3.12 + openpyxl (conversion), TypeScript + React 18 + Recharts (dashboard), Vitest (metrics tests).

**Source xlsx structure (confirmed):** 14 sheets. Sheet index 2–13 are the monthly reports (Jan..Dec, note: sheets 11–13 are named "Mensaa" with typo). Monthly sheet layout (column G = value column):
- R4–R54: membros (51 rows, #1–51)
- R58: TOTAL membros
- R60–R97: não-membros (variable — some custom labels like "Outros: Juliano Alberto + Luiz Cláudio")
- R98: TOTAL não-membros
- R100–R104: Ofertas (Anônimas, Missões, Recanto Vida, Beneficência, Outros)
- R105: TOTAL ofertas
- R107 col C: saldo anterior; R107 col G: total entradas do mês; R109 col G: somatório geral
- R115–R124+: saídas (Plano Coop, Zeladoria, Sustento, Missões, COPASA, CEMIG, Manutenção, Eventuais, Outros, + custom rows like "1/3 Férias do Obreiro")
- R128: TOTAL saídas
- R130–R135: RESUMO (total entrada, total saída, saldo mês, saldo anterior, novo saldo)

**Annual totals (for final reconciliation):** Entradas R$ 104.539,56 · Saídas R$ 92.137,54 · Saldo 2025 R$ 12.402,02. Opening balance Jan/2025 = R$ 7.264,71. Closing balance Dec/2025 = R$ 19.666,73 (matches existing Jan/2026 `saldoAnterior` — key continuity anchor).

---

## File Structure

**Create (Finance repo):**
- `Finance/Tesouraria-PIB-Confins/2025-{01..12}-<mes>/relatorio_mensal_2025-MM.md` (12 generated files)

**Create (pibconfins-site repo):**
- `scripts/xlsx_2025_to_md.py` — one-shot converter
- `scripts/test_xlsx_2025_to_md.py` — pytest suite for converter
- `src/lib/metrics.ts` — derivation functions
- `src/lib/metrics.test.ts` — Vitest unit tests
- `src/components/ContribChart.tsx` — line chart: active contributors per month
- `src/components/SaldoAcumuladoChart.tsx` — area chart: accumulated balance
- `src/components/CategoriaDonut.tsx` — reusable donut for entradas/saídas
- `src/components/YoyTable.tsx` — year-over-year comparison table
- `src/components/RetencaoCard.tsx` — retention KPI card
- `src/components/YearAccordion.tsx` — collapsible grouping of month cards

**Modify:**
- `src/pages/Home.tsx` — restructured into sections using new components
- `Finance/Tesouraria-PIB-Confins/contribuintes.csv` — append 2025-only names with `origem=2025-historico`
- `Finance/Tesouraria-PIB-Confins/CLAUDE.md` — add line under "Histórico por mês" section noting 2025 was imported from Pastor Luis's xlsx

**Do not touch:**
- `scripts/build_data.py` — auto-discovers via glob; needs no changes
- `src/types.ts` — schema already supports 2025 data
- Existing components (`KpiTile`, `TrendChart`, `MonthCard`, `ContributorsTable`)

---

## Phase A — Ingest 2025

### Task 1: Scaffold conversion script

**Files:**
- Create: `scripts/xlsx_2025_to_md.py`
- Create: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Create empty test file and run it**

```python
# scripts/test_xlsx_2025_to_md.py
"""Tests for 2025 xlsx converter."""
from pathlib import Path

import pytest

XLSX = Path.home() / "Data/Documents/Finance/2025/Planilha de Acompanhamento Financeiro - 2025.xlsx"


@pytest.fixture(scope="session")
def wb():
    import openpyxl
    return openpyxl.load_workbook(XLSX, data_only=True)


def test_xlsx_exists():
    assert XLSX.exists(), f"Source xlsx missing: {XLSX}"


def test_has_14_sheets(wb):
    assert len(wb.sheetnames) == 14
```

Run: `cd ~/Projects/amiticia/repositories/pibconfins-site && python3 -m pytest scripts/test_xlsx_2025_to_md.py -v`
Expected: 2 passed.

- [ ] **Step 2: Create script skeleton with constants**

```python
# scripts/xlsx_2025_to_md.py
#!/usr/bin/env python3
"""Convert Pastor Luis's 2025 consolidated xlsx into 12 relatorio_mensal_2025-MM.md files.

This is a one-shot importer — the 2026 flow uses /tesouraria-fechar, not this script.
Run once, commit the resulting 12 folders, then discard.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from pathlib import Path

import openpyxl

XLSX_DEFAULT = Path.home() / "Data/Documents/Finance/2025/Planilha de Acompanhamento Financeiro - 2025.xlsx"
FINANCE_ROOT = Path.home() / "Data/Documents/Finance/Tesouraria-PIB-Confins"

# Monthly sheets are at workbook indices 2..13 (1-based, skipping global + dizimos sheets).
# Using index rather than name because sheets 11-13 have "Mensaa" typo.
MONTHLY_SHEET_INDEX = list(range(2, 14))  # 12 sheets

MONTH_NAMES = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
}

MONTH_SLUG = {
    1: "janeiro", 2: "fevereiro", 3: "marco", 4: "abril",
    5: "maio", 6: "junho", 7: "julho", 8: "agosto",
    9: "setembro", 10: "outubro", 11: "novembro", 12: "dezembro",
}

# Row coordinates inside each monthly sheet (column G = 7 holds all values)
ROW_MEMBROS = (4, 54)     # inclusive
ROW_TOTAL_MEMBROS = 58
ROW_NAO_MEMBROS_START = 60
ROW_TOTAL_NAO_MEMBROS = 98
ROW_OFERTAS = {
    "anonimas": 100, "missoes": 101, "recantoVida": 102,
    "beneficencia": 103, "outros": 104,
}
ROW_TOTAL_OFERTAS = 105
ROW_SALDO_ANTERIOR = 107  # col C
ROW_TOTAL_ENTRADAS_MES = 107  # col G
ROW_SOMATORIO_ENTRADAS = 109  # col G
ROW_SAIDAS = {
    "planoCooperativo": 115, "zeladoria": 116, "sustentoMinisterial": 117,
    "missoes": 118, "copasa": 119, "cemig": 120,
    "manutencao": 121, "despesasEventuais": 122, "outros": 123,
}
ROW_TOTAL_SAIDAS = 128
ROW_RESUMO_SALDO_MES = 132
ROW_RESUMO_NOVO_SALDO = 135
COL_VALUE = 7  # G
COL_LABEL = 2  # B
COL_SALDO_ANT = 3  # C


def cell_num(ws, row: int, col: int) -> float | None:
    v = ws.cell(row, col).value
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
```

- [ ] **Step 3: Commit skeleton**

```bash
cd ~/Projects/amiticia/repositories/pibconfins-site
git add scripts/xlsx_2025_to_md.py scripts/test_xlsx_2025_to_md.py
git commit -m "scripts: scaffold 2025 xlsx converter"
```

---

### Task 2: Extract membros

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`
- Modify: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Write failing test for Janeiro membros**

```python
# append to test_xlsx_2025_to_md.py
def test_janeiro_membros_known_values(wb):
    from xlsx_2025_to_md import extract_membros
    ws = wb.worksheets[2]  # Janeiro
    membros, total = extract_membros(ws)
    assert len(membros) == 51
    # from direct inspection of row 4: Adenayr Morgan Marques = 130
    assert membros[0] == ("Adenayr Morgan Marques", 130.0)
    # row 10: Braz Francisco de Moura = 400
    assert membros[6] == ("Braz Francisco de Moura", 400.0)
    # row 6: Alessandra ... = None (empty)
    assert membros[2][1] is None
    # printed total row 58
    assert total == 2140.0
```

Run: `cd scripts && python3 -m pytest test_xlsx_2025_to_md.py::test_janeiro_membros_known_values -v`
Expected: FAIL (`extract_membros` not defined).

- [ ] **Step 2: Implement extract_membros**

```python
def extract_membros(ws) -> tuple[list[tuple[str, float | None]], float]:
    """Return (list of (name, value|None), printed total)."""
    result = []
    for row in range(ROW_MEMBROS[0], ROW_MEMBROS[1] + 1):
        name = ws.cell(row, COL_LABEL).value
        if not name:
            continue
        value = cell_num(ws, row, COL_VALUE)
        result.append((str(name).strip(), value))
    total = cell_num(ws, ROW_TOTAL_MEMBROS, COL_VALUE) or 0.0
    return result, total
```

Run test again. Expected: PASS.

- [ ] **Step 3: Add full-year sum test**

```python
def test_membros_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_membros
    total_ano = 0.0
    for idx in range(2, 14):
        _, tot = extract_membros(wb.worksheets[idx])
        total_ano += tot
    # Global sheet row 3 col O (annual total dizimos)
    assert round(total_ano, 2) == 35316.00
```

Run. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/xlsx_2025_to_md.py scripts/test_xlsx_2025_to_md.py
git commit -m "scripts: extract membros from monthly xlsx sheets"
```

---

### Task 3: Extract não-membros (variable-length section with custom labels)

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`
- Modify: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Write failing test**

```python
def test_janeiro_nao_membros(wb):
    from xlsx_2025_to_md import extract_nao_membros
    ws = wb.worksheets[2]
    nao_m, total = extract_nao_membros(ws)
    # at least 34 standard rows, some with custom labels at 94-97
    assert len(nao_m) >= 34
    # Ronald Alexander Morais Pereira (row 88) = 1100
    assert ("Ronald Alexander Morais Pereira", 1100.0) in nao_m
    # custom label row preserved
    assert any("Juliano Alberto" in n for n, _ in nao_m)
    assert total == 5519.0
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement extract_nao_membros**

```python
def extract_nao_membros(ws) -> tuple[list[tuple[str, float | None]], float]:
    """Non-members section runs from row 60 until the TOTAL row (98).
    Rows are numbered #1..#N in col A; some rows (e.g. 94-97) have compound labels.
    Skip rows without a name in col B."""
    result = []
    for row in range(ROW_NAO_MEMBROS_START, ROW_TOTAL_NAO_MEMBROS):
        name = ws.cell(row, COL_LABEL).value
        if not name or str(name).strip().upper() == "TOTAL":
            continue
        value = cell_num(ws, row, COL_VALUE)
        result.append((str(name).strip(), value))
    total = cell_num(ws, ROW_TOTAL_NAO_MEMBROS, COL_VALUE) or 0.0
    return result, total
```

Run. Expected: PASS.

- [ ] **Step 3: Annual reconciliation test**

```python
def test_nao_membros_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_nao_membros
    total_ano = 0.0
    for idx in range(2, 14):
        _, tot = extract_nao_membros(wb.worksheets[idx])
        total_ano += tot
    # Global row 8 col O
    assert round(total_ano, 2) == 54135.66
```

Run. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "scripts: extract nao-membros from monthly xlsx sheets"
```

---

### Task 4: Extract ofertas + entrada geral

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`
- Modify: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Write failing test**

```python
def test_janeiro_ofertas_and_entrada_geral(wb):
    from xlsx_2025_to_md import extract_ofertas, extract_entrada_geral
    ws = wb.worksheets[2]
    ofertas, total_of = extract_ofertas(ws)
    assert ofertas == {
        "anonimas": 553.55, "missoes": 0.0, "recantoVida": 30.0,
        "beneficencia": 0.0, "outros": 155.85,
    }
    assert total_of == 739.4
    eg = extract_entrada_geral(ws)
    assert eg["saldoAnterior"] == 7264.71
    assert eg["totalMes"] == 8398.4
    assert eg["somatorio"] == 15663.11
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement both**

```python
def extract_ofertas(ws) -> tuple[dict, float]:
    ofertas = {k: cell_num(ws, row, COL_VALUE) for k, row in ROW_OFERTAS.items()}
    total = cell_num(ws, ROW_TOTAL_OFERTAS, COL_VALUE) or 0.0
    return ofertas, total


def extract_entrada_geral(ws) -> dict:
    return {
        "saldoAnterior": cell_num(ws, ROW_SALDO_ANTERIOR, COL_SALDO_ANT),
        "totalMes": cell_num(ws, ROW_TOTAL_ENTRADAS_MES, COL_VALUE),
        "somatorio": cell_num(ws, ROW_SOMATORIO_ENTRADAS, COL_VALUE),
    }
```

Run. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "scripts: extract ofertas and entrada geral"
```

---

### Task 5: Extract saídas + resumo (incl. custom expense rows)

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`
- Modify: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Write failing test for Janeiro saídas**

```python
def test_janeiro_saidas(wb):
    from xlsx_2025_to_md import extract_saidas, extract_resumo
    ws = wb.worksheets[2]
    s = extract_saidas(ws)
    # named categories
    assert s["planoCooperativo"] == 214.0
    assert s["zeladoria"] == 506.0
    assert s["sustentoMinisterial"] == 1500.0
    assert s["copasa"] == 0.0
    assert s["cemig"] == 190.0
    assert s["manutencao"] == 22.0
    assert s["despesasEventuais"] == 0.0
    # "Outros" row 123 = 735.36
    # "1/3 Férias do Obreiro" row 124 = 1656.57 (custom, should appear in outros list)
    outros_labels = [o["descricao"] for o in s["outros"]]
    outros_values = [o["valor"] for o in s["outros"]]
    assert "1/3 Férias do Obreiro" in outros_labels
    assert 1656.57 in outros_values
    assert 735.36 in outros_values
    assert s["total"] == 4823.93
    r = extract_resumo(ws)
    assert r["saldoMes"] == pytest.approx(3574.47, abs=0.01)
    assert r["novoSaldo"] == 10839.18
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement extract_saidas + extract_resumo**

```python
def extract_saidas(ws) -> dict:
    """Named categories are at fixed rows. Rows 123+ may contain 'Outros' label plus
    custom labels (e.g. '1/3 Férias do Obreiro') — collect all non-empty rows between
    the named 'Outros' (123) and TOTAL (128) as `outros` list."""
    result = {}
    for key, row in ROW_SAIDAS.items():
        if key == "outros":
            continue
        v = cell_num(ws, row, COL_VALUE)
        # scalar fields that default to 0 when absent
        if key in ("planoCooperativo", "zeladoria", "sustentoMinisterial", "copasa"):
            result[key] = v if v is not None else 0.0
        else:
            result[key] = v  # None if blank
    # "Outros" and any custom rows between 123..127
    outros = []
    for row in range(ROW_SAIDAS["outros"], ROW_TOTAL_SAIDAS):
        label = ws.cell(row, COL_LABEL).value
        v = cell_num(ws, row, COL_VALUE)
        if not label or v is None or v == 0:
            continue
        outros.append({"descricao": str(label).strip(), "valor": round(v, 2)})
    result["outros"] = outros
    result["total"] = cell_num(ws, ROW_TOTAL_SAIDAS, COL_VALUE) or 0.0
    return result


def extract_resumo(ws) -> dict:
    return {
        "saldoMes": cell_num(ws, ROW_RESUMO_SALDO_MES, COL_VALUE),
        "novoSaldo": cell_num(ws, ROW_RESUMO_NOVO_SALDO, COL_VALUE),
    }
```

Run. Expected: PASS.

- [ ] **Step 3: Annual saídas reconciliation**

```python
def test_saidas_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_saidas
    total_ano = 0.0
    for idx in range(2, 14):
        s = extract_saidas(wb.worksheets[idx])
        total_ano += s["total"]
    assert round(total_ano, 2) == 92137.54
```

Run. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "scripts: extract saidas (incl custom expense rows) and resumo"
```

---

### Task 6: Render .md template

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`
- Modify: `scripts/test_xlsx_2025_to_md.py`

- [ ] **Step 1: Write failing test**

```python
def test_render_md_shape(wb):
    from xlsx_2025_to_md import render_md, extract_month
    data = extract_month(wb.worksheets[2], month=1)
    md = render_md(data, month=1)
    assert md.startswith("# Relatório Financeiro — Congregação em Confins — Janeiro/2025")
    assert "## ENTRADAS — Membros" in md
    assert "## ENTRADAS — Não Membros" in md
    assert "## OFERTAS" in md
    assert "## ENTRADA GERAL" in md
    assert "## SAÍDAS" in md
    assert "## RESUMO DE CAIXA" in md
    # known values rendered
    assert "Adenayr Morgan Marques | 130,00" in md
    assert "**TOTAL MEMBROS** | **R$ 2.140,00**" in md
    assert "R$ 10.839,18" in md  # novo saldo
    # header note
    assert "Gerado a partir da Planilha 2025" in md
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement formatter helpers + extract_month + render_md**

```python
@dataclass
class MesData:
    month: int
    membros: list[tuple[str, float | None]]
    total_membros: float
    nao_membros: list[tuple[str, float | None]]
    total_nao_membros: float
    ofertas: dict
    total_ofertas: float
    entrada_geral: dict
    saidas: dict
    resumo: dict


def extract_month(ws, month: int) -> MesData:
    membros, total_m = extract_membros(ws)
    nao_m, total_nm = extract_nao_membros(ws)
    of, total_of = extract_ofertas(ws)
    return MesData(
        month=month,
        membros=membros, total_membros=total_m,
        nao_membros=nao_m, total_nao_membros=total_nm,
        ofertas=of, total_ofertas=total_of,
        entrada_geral=extract_entrada_geral(ws),
        saidas=extract_saidas(ws),
        resumo=extract_resumo(ws),
    )


def fmt_brl(v: float | None) -> str:
    """1234.56 -> '1.234,56'; None -> '—'."""
    if v is None:
        return "—"
    negative = v < 0
    s = f"{abs(v):,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return f"-{s}" if negative else s


def _pessoa_row(i: int, nome: str, valor: float | None) -> str:
    return f"| {i} | {nome} | {fmt_brl(valor)} |"


def render_md(d: MesData, month: int) -> str:
    mes_nome = MONTH_NAMES[month]
    lines = [
        f"# Relatório Financeiro — Congregação em Confins — {mes_nome}/2025",
        "",
        "> **Gerado a partir da Planilha 2025 consolidada de Pr. Luis em 2026-04-15.**",
        "> Totais derivados da planilha; comprovantes individuais não disponíveis neste histórico.",
        "",
        "---",
        "",
        "## ENTRADAS — Membros",
        "",
        "| # | Nome | Valor (R$) |",
        "|---|------|-----------:|",
    ]
    for i, (nome, valor) in enumerate(d.membros, start=1):
        lines.append(_pessoa_row(i, nome, valor))
    lines.append(f"| | **TOTAL MEMBROS** | **R$ {fmt_brl(d.total_membros)}** |")
    lines += ["", "## ENTRADAS — Não Membros", "",
              "| # | Nome | Valor (R$) |",
              "|---|------|-----------:|"]
    for i, (nome, valor) in enumerate(d.nao_membros, start=1):
        lines.append(_pessoa_row(i, nome, valor))
    lines.append(f"| | **TOTAL NÃO MEMBROS** | **R$ {fmt_brl(d.total_nao_membros)}** |")
    lines += ["", "## OFERTAS", "",
              "| Tipo | Valor (R$) |", "|------|-----------:|",
              f"| Anônimas | {fmt_brl(d.ofertas['anonimas'])} |",
              f"| Missões | {fmt_brl(d.ofertas['missoes'])} |",
              f"| Recanto Vida | {fmt_brl(d.ofertas['recantoVida'])} |",
              f"| Beneficência | {fmt_brl(d.ofertas['beneficencia'])} |",
              f"| Outros | {fmt_brl(d.ofertas['outros'])} |",
              f"| **TOTAL OFERTAS** | **R$ {fmt_brl(d.total_ofertas)}** |"]
    eg = d.entrada_geral
    lines += ["", "## ENTRADA GERAL", "",
              "| | |", "|---|---:|",
              f"| Saldo Recorrente do Mês Anterior | R$ {fmt_brl(eg['saldoAnterior'])} |",
              f"| Total de Entradas Deste Mês | R$ {fmt_brl(eg['totalMes'])} |",
              f"| **Somatório Geral de Entradas** | **R$ {fmt_brl(eg['somatorio'])}** |"]
    s = d.saidas
    lines += ["", "## SAÍDAS", "",
              "| Especificação | Valor (R$) |", "|---|---:|",
              f"| Plano Cooperativo | {fmt_brl(s['planoCooperativo'])} |",
              f"| Zeladoria (1/3 do salário vigente) | {fmt_brl(s['zeladoria'])} |",
              f"| Sustento Ministerial | {fmt_brl(s['sustentoMinisterial'])} |",
              f"| Missões | {fmt_brl(s['missoes'])} |",
              f"| COPASA | {fmt_brl(s['copasa'])} |",
              f"| CEMIG | {fmt_brl(s['cemig'])} |",
              f"| Manutenção e Limpeza | {fmt_brl(s['manutencao'])} |",
              f"| Despesas Eventuais | {fmt_brl(s['despesasEventuais'])} |"]
    for o in s["outros"]:
        lines.append(f"| {o['descricao']} | {fmt_brl(o['valor'])} |")
    lines.append(f"| **TOTAL SAÍDAS** | **R$ {fmt_brl(s['total'])}** |")
    r = d.resumo
    lines += ["", "## RESUMO DE CAIXA", "",
              "| | |", "|---|---:|",
              f"| Total de Entrada do Mês | R$ {fmt_brl(eg['totalMes'])} |",
              f"| Total de Saídas do Mês | R$ {fmt_brl(s['total'])} |",
              f"| **Saldo do Mês** | **R$ {fmt_brl(r['saldoMes'])}** |",
              f"| Saldo Recorrente do Mês Anterior | R$ {fmt_brl(eg['saldoAnterior'])} |",
              f"| **Novo Saldo Para o Próximo Mês** | **R$ {fmt_brl(r['novoSaldo'])}** |",
              "", "## Assinaturas", "",
              "- Presidente: Luis Gustavo Amaral Muritiba ___________________________",
              "- 1º Tesoureiro: ___________________________________________________",
              "- 2º Tesoureiro: ___________________________________________________"]
    return "\n".join(lines) + "\n"
```

Run. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/
git commit -m "scripts: render .md from extracted month data"
```

---

### Task 7: CLI + write files + run reconciliation

**Files:**
- Modify: `scripts/xlsx_2025_to_md.py`

- [ ] **Step 1: Add main() + write_all**

```python
def write_all(xlsx: Path, out_root: Path, dry_run: bool = False) -> None:
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    anual_entradas = 0.0
    anual_saidas = 0.0
    for idx in range(12):
        month = idx + 1
        ws = wb.worksheets[idx + 2]  # skip global + dizimos
        data = extract_month(ws, month)
        md = render_md(data, month)
        folder = out_root / f"2025-{month:02d}-{MONTH_SLUG[month]}"
        target = folder / f"relatorio_mensal_2025-{month:02d}.md"
        anual_entradas += data.entrada_geral["totalMes"] or 0
        anual_saidas += data.saidas["total"]
        if dry_run:
            print(f"would write {target}")
            continue
        folder.mkdir(parents=True, exist_ok=True)
        target.write_text(md, encoding="utf-8")
        print(f"✓ wrote {target}")
    print(f"\nAnnual totals: entradas={anual_entradas:.2f}  saídas={anual_saidas:.2f}")
    assert abs(anual_entradas - 104539.56) < 0.01, f"entradas mismatch: {anual_entradas}"
    assert abs(anual_saidas - 92137.54) < 0.01, f"saídas mismatch: {anual_saidas}"
    print("✓ annual totals reconcile with global sheet")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", type=Path, default=XLSX_DEFAULT)
    ap.add_argument("--out", type=Path, default=FINANCE_ROOT)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    write_all(args.xlsx, args.out, args.dry_run)
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
```

- [ ] **Step 2: Dry run**

Run: `cd ~/Projects/amiticia/repositories/pibconfins-site && python3 scripts/xlsx_2025_to_md.py --dry-run`
Expected: 12 "would write" lines + annual totals assertion passes.

- [ ] **Step 3: Real run**

Run: `python3 scripts/xlsx_2025_to_md.py`
Expected: 12 "✓ wrote" lines + "✓ annual totals reconcile".

- [ ] **Step 4: Verify with existing build_data.py**

Run: `python3 scripts/build_data.py --check`
Expected: all 15 months print `✓ ... totais conferem`. No flagged months.

- [ ] **Step 5: Commit script + test suite**

```bash
cd ~/Projects/amiticia/repositories/pibconfins-site
git add scripts/
git commit -m "scripts: xlsx_2025_to_md CLI + annual reconciliation"
```

- [ ] **Step 6: Commit the generated .md files in the Finance repo**

```bash
cd ~/Data/Documents/Finance/Tesouraria-PIB-Confins
git status  # should show 12 new 2025-* folders
git add 2025-*-*/
git commit -m "Tesouraria PIB Confins: import histórico 2025 da planilha do Pr. Luis"
```

---

### Task 8: Update contribuintes.csv with 2025-only names

**Files:**
- Modify: `Finance/Tesouraria-PIB-Confins/contribuintes.csv`
- Modify: `Finance/Tesouraria-PIB-Confins/CLAUDE.md`

- [ ] **Step 1: Identify new names**

Run:
```bash
cd ~/Data/Documents/Finance/Tesouraria-PIB-Confins
python3 -c "
import csv, re
from pathlib import Path
existing = set()
with open('contribuintes.csv') as f:
    for r in csv.DictReader(f):
        existing.add(r['nome'].strip())
new = set()
for md in Path('.').glob('2025-*/relatorio_mensal_*.md'):
    for m in re.finditer(r'^\|\s*\d+\s*\|\s*([^|]+?)\s*\|', md.read_text(), re.M):
        nome = m.group(1).strip()
        if nome and nome not in existing:
            new.add(nome)
for n in sorted(new):
    print(n)
"
```
Expected: zero or a handful of names (most 2025 contributors overlap with 2026 list).

- [ ] **Step 2: Append new rows**

For each new name, append a row: `<nome>,,,2025-historico` (cpf empty, cpf_masked empty, origem=2025-historico) — edit manually after reviewing the list, respecting existing CSV header format. If list is empty, skip.

- [ ] **Step 3: Update CLAUDE.md historical section**

Add under "Histórico por mês":
```
- **Jan–Dez/2025**: importado 2026-04-15 da Planilha Consolidada do Pr. Luis (`../2025/Planilha de Acompanhamento Financeiro - 2025.xlsx`) via `pibconfins-site/scripts/xlsx_2025_to_md.py`. Totais anuais batem (entradas R$ 104.539,56 · saídas R$ 92.137,54). Comprovantes individuais não disponíveis.
```

- [ ] **Step 4: Commit**

```bash
git add contribuintes.csv CLAUDE.md
git commit -m "Tesouraria: registra import 2025 no CLAUDE.md + contribuintes novos"
```

---

## Phase B — Dashboard metrics library

### Task 9: `metrics.ts` — active contributors per month

**Files:**
- Create: `src/lib/metrics.ts`
- Create: `src/lib/metrics.test.ts`

Prerequisite: vitest is already in the Vite toolchain. Verify with:
```bash
cd ~/Projects/amiticia/repositories/pibconfins-site
grep '"vitest"' package.json
```
If not installed: `npm install --save-dev vitest`.

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/metrics.test.ts
import { describe, it, expect } from "vitest";
import type { Mes } from "@/types";
import { contribuintesAtivosPorMes } from "./metrics";

const mockMes = (ref: string, membros: [string, number | null][], naoMembros: [string, number | null][] = []): Mes => ({
  ref,
  nome: ref,
  saldoAnterior: 0,
  entradas: {
    membros: membros.map(([nome, valor]) => ({ nome, valor })),
    naoMembros: naoMembros.map(([nome, valor]) => ({ nome, valor })),
    ofertas: { anonimas: null, missoes: null, recantoVida: null, beneficencia: null, outros: null },
    totais: { membros: 0, naoMembros: 0, ofertas: 0, geral: 0 },
  },
  saidas: { planoCooperativo: 0, zeladoria: 0, sustentoMinisterial: 0, missoes: null, copasa: 0, cemig: null, manutencao: null, despesasEventuais: null, outros: [], total: 0 },
  resumo: { saldoMes: 0, novoSaldo: 0 },
  validacao: { status: "ok", flags: [] },
});

describe("contribuintesAtivosPorMes", () => {
  it("counts contributors with non-null positive values", () => {
    const meses = [
      mockMes("2025-01", [["A", 100], ["B", null], ["C", 0]], [["X", 50]]),
      mockMes("2025-02", [["A", 100], ["B", 200]], []),
    ];
    const out = contribuintesAtivosPorMes(meses);
    expect(out).toEqual([
      { ref: "2025-01", membros: 1, naoMembros: 1, total: 2 },
      { ref: "2025-02", membros: 2, naoMembros: 0, total: 2 },
    ]);
  });
});
```

Run: `npx vitest run src/lib/metrics.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement**

```typescript
// src/lib/metrics.ts
import type { Mes } from "@/types";

export type AtivosMes = { ref: string; membros: number; naoMembros: number; total: number };

const isAtivo = (valor: number | null): boolean => valor != null && valor > 0;

export function contribuintesAtivosPorMes(meses: Mes[]): AtivosMes[] {
  return meses.map((m) => {
    const membros = m.entradas.membros.filter((c) => isAtivo(c.valor)).length;
    const naoMembros = m.entradas.naoMembros.filter((c) => isAtivo(c.valor)).length;
    return { ref: m.ref, membros, naoMembros, total: membros + naoMembros };
  });
}
```

Run. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "metrics: contribuintesAtivosPorMes"
```

---

### Task 10: `metrics.ts` — YTD comparison and category compositions

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/metrics.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { ytdComparavel, composicaoEntradas, composicaoSaidas } from "./metrics";

describe("ytdComparavel", () => {
  it("limits both years to the intersection of months", () => {
    const meses = [
      mockMes("2025-01", [["A", 100]]),
      mockMes("2025-02", [["B", 200]]),
      mockMes("2025-03", [["C", 300]]),
      mockMes("2026-01", [["D", 400]]),
      mockMes("2026-02", [["E", 500]]),
    ];
    const out = ytdComparavel(meses, 2025, 2026);
    expect(out.yearA.map((m) => m.ref)).toEqual(["2025-01", "2025-02"]);
    expect(out.yearB.map((m) => m.ref)).toEqual(["2026-01", "2026-02"]);
  });
});

describe("composicaoEntradas", () => {
  it("aggregates categories for a given year", () => {
    const m = mockMes("2025-01", [["A", 100]], [["X", 50]]);
    m.entradas.ofertas = { anonimas: 20, missoes: 10, recantoVida: 5, beneficencia: 0, outros: null };
    const out = composicaoEntradas([m], 2025);
    expect(out).toEqual([
      { categoria: "Dízimos", valor: 100 },
      { categoria: "Não-Membros", valor: 50 },
      { categoria: "Anônimas", valor: 20 },
      { categoria: "Missões", valor: 10 },
      { categoria: "Recanto Vida", valor: 5 },
      { categoria: "Beneficência", valor: 0 },
      { categoria: "Outros", valor: 0 },
    ]);
  });
});
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement**

```typescript
export function ytdComparavel(meses: Mes[], yearA: number, yearB: number): { yearA: Mes[]; yearB: Mes[] } {
  const a = meses.filter((m) => m.ref.startsWith(String(yearA)));
  const b = meses.filter((m) => m.ref.startsWith(String(yearB)));
  const common = Math.min(a.length, b.length);
  // compare only months that exist in both
  const monthsOfB = new Set(b.slice(0, common).map((m) => m.ref.slice(5)));
  return {
    yearA: a.filter((m) => monthsOfB.has(m.ref.slice(5))),
    yearB: b.slice(0, common),
  };
}

export type CategoriaValor = { categoria: string; valor: number };

export function composicaoEntradas(meses: Mes[], year: number): CategoriaValor[] {
  const filt = meses.filter((m) => m.ref.startsWith(String(year)));
  const sum = (fn: (m: Mes) => number) => filt.reduce((a, m) => a + fn(m), 0);
  const sumOferta = (k: keyof Mes["entradas"]["ofertas"]) =>
    filt.reduce((a, m) => a + (m.entradas.ofertas[k] ?? 0), 0);
  return [
    { categoria: "Dízimos", valor: sum((m) => m.entradas.totais.membros) },
    { categoria: "Não-Membros", valor: sum((m) => m.entradas.totais.naoMembros) },
    { categoria: "Anônimas", valor: sumOferta("anonimas") },
    { categoria: "Missões", valor: sumOferta("missoes") },
    { categoria: "Recanto Vida", valor: sumOferta("recantoVida") },
    { categoria: "Beneficência", valor: sumOferta("beneficencia") },
    { categoria: "Outros", valor: sumOferta("outros") },
  ];
}

export function composicaoSaidas(meses: Mes[], year: number): CategoriaValor[] {
  const filt = meses.filter((m) => m.ref.startsWith(String(year)));
  const sum = (fn: (m: Mes) => number | null | undefined) =>
    filt.reduce((a, m) => a + (fn(m) ?? 0), 0);
  const sumOutros = filt.reduce((a, m) => a + m.saidas.outros.reduce((x, o) => x + o.valor, 0), 0);
  return [
    { categoria: "Sustento Ministerial", valor: sum((m) => m.saidas.sustentoMinisterial) },
    { categoria: "Zeladoria", valor: sum((m) => m.saidas.zeladoria) },
    { categoria: "Plano Cooperativo", valor: sum((m) => m.saidas.planoCooperativo) },
    { categoria: "COPASA", valor: sum((m) => m.saidas.copasa) },
    { categoria: "CEMIG", valor: sum((m) => m.saidas.cemig) },
    { categoria: "Manutenção", valor: sum((m) => m.saidas.manutencao) },
    { categoria: "Missões", valor: sum((m) => m.saidas.missoes) },
    { categoria: "Despesas Eventuais", valor: sum((m) => m.saidas.despesasEventuais) },
    { categoria: "Outros", valor: sumOutros },
  ];
}
```

Run. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "metrics: ytdComparavel + composições por categoria"
```

---

### Task 11: `metrics.ts` — retention (2025 → 2026)

**Files:**
- Modify: `src/lib/metrics.ts`
- Modify: `src/lib/metrics.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { retencao } from "./metrics";

describe("retencao", () => {
  it("computes retidos/novos/sairam between years", () => {
    const meses = [
      mockMes("2025-01", [["A", 100], ["B", 200]], [["X", 50]]),
      mockMes("2025-02", [["A", 100], ["C", 300]], []),
      mockMes("2026-01", [["A", 100]], [["X", 50], ["Y", 70]]),
    ];
    const r = retencao(meses, 2025, 2026);
    // in 2025: A, B, C (members) + X (non-member)
    // in 2026: A, X, Y
    // retidos: A, X = 2
    // novos: Y = 1
    // sairam: B, C = 2
    expect(r).toEqual({ retidos: 2, novos: 1, sairam: 2, totalAnoAnterior: 4 });
  });
});
```

Run. Expected: FAIL.

- [ ] **Step 2: Implement**

```typescript
function contribuintesUnicos(meses: Mes[]): Set<string> {
  const set = new Set<string>();
  for (const m of meses) {
    for (const c of m.entradas.membros) if (isAtivo(c.valor)) set.add(`m:${c.nome}`);
    for (const c of m.entradas.naoMembros) if (isAtivo(c.valor)) set.add(`n:${c.nome}`);
  }
  return set;
}

export type Retencao = { retidos: number; novos: number; sairam: number; totalAnoAnterior: number };

export function retencao(meses: Mes[], yearA: number, yearB: number): Retencao {
  const setA = contribuintesUnicos(meses.filter((m) => m.ref.startsWith(String(yearA))));
  const setB = contribuintesUnicos(meses.filter((m) => m.ref.startsWith(String(yearB))));
  let retidos = 0;
  for (const k of setA) if (setB.has(k)) retidos++;
  const novos = [...setB].filter((k) => !setA.has(k)).length;
  const sairam = setA.size - retidos;
  return { retidos, novos, sairam, totalAnoAnterior: setA.size };
}
```

Run. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/metrics.ts src/lib/metrics.test.ts
git commit -m "metrics: retenção YoY"
```

---

## Phase C — New components

### Task 12: `ContribChart` — line chart of active contributors

**Files:**
- Create: `src/components/ContribChart.tsx`

- [ ] **Step 1: Implement**

```tsx
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { contribuintesAtivosPorMes } from "@/lib/metrics";

export function ContribChart({ meses }: { meses: Mes[] }) {
  const data = contribuintesAtivosPorMes(meses).map((d) => ({
    mes: d.ref,
    Membros: d.membros,
    "Não-Membros": d.naoMembros,
    Total: d.total,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="mes" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
          <Legend />
          <Line type="monotone" dataKey="Membros" stroke="hsl(var(--primary))" strokeWidth={2} />
          <Line type="monotone" dataKey="Não-Membros" stroke="hsl(var(--accent))" strokeWidth={2} />
          <Line type="monotone" dataKey="Total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Visual check**

Run `npm run dev` and verify component renders when manually imported (deferred — full check happens in Task 18).

- [ ] **Step 3: Commit**

```bash
git add src/components/ContribChart.tsx
git commit -m "components: ContribChart (active contributors per month)"
```

---

### Task 13: `SaldoAcumuladoChart` — area chart of balance over time

**Files:**
- Create: `src/components/SaldoAcumuladoChart.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { formatBRL, formatBRLCompact } from "@/lib/currency";

export function SaldoAcumuladoChart({ meses }: { meses: Mes[] }) {
  const data = meses.map((m) => ({ mes: m.ref, Saldo: m.resumo.novoSaldo }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="mes" className="text-xs" />
          <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
          <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
          <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SaldoAcumuladoChart.tsx
git commit -m "components: SaldoAcumuladoChart (balance over time)"
```

---

### Task 14: `CategoriaDonut` — reusable pie chart

**Files:**
- Create: `src/components/CategoriaDonut.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaValor } from "@/lib/metrics";
import { formatBRL } from "@/lib/currency";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",   // green
  "hsl(48 96% 53%)",    // yellow
  "hsl(350 80% 60%)",   // pink
  "hsl(260 60% 60%)",   // purple
  "hsl(200 70% 50%)",   // blue
  "hsl(25 85% 55%)",    // orange
  "hsl(180 50% 45%)",   // teal
];

export function CategoriaDonut({ data, title }: { data: CategoriaValor[]; title: string }) {
  const nonZero = data.filter((d) => d.valor > 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={nonZero} dataKey="valor" nameKey="categoria" innerRadius={50} outerRadius={85} paddingAngle={2}>
              {nonZero.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CategoriaDonut.tsx
git commit -m "components: CategoriaDonut (reusable pie for entradas/saídas)"
```

---

### Task 15: `YoyTable` — year-over-year comparison

**Files:**
- Create: `src/components/YoyTable.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Mes } from "@/types";
import { composicaoEntradas, composicaoSaidas, ytdComparavel } from "@/lib/metrics";
import { formatBRL } from "@/lib/currency";

function delta(a: number, b: number): string {
  if (a === 0) return b === 0 ? "—" : "+∞";
  const pct = ((b - a) / Math.abs(a)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function YoyTable({ meses, yearA, yearB }: { meses: Mes[]; yearA: number; yearB: number }) {
  const { yearA: mesesA, yearB: mesesB } = ytdComparavel(meses, yearA, yearB);
  const entA = composicaoEntradas(mesesA, yearA);
  const entB = composicaoEntradas(mesesB, yearB);
  const saiA = composicaoSaidas(mesesA, yearA);
  const saiB = composicaoSaidas(mesesB, yearB);
  const rows = [
    { grupo: "Entradas", itens: entA.map((r, i) => ({ categoria: r.categoria, a: r.valor, b: entB[i].valor })) },
    { grupo: "Saídas", itens: saiA.map((r, i) => ({ categoria: r.categoria, a: r.valor, b: saiB[i].valor })) },
  ];
  const monthsCount = mesesB.length;
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Comparativo anual — primeiros {monthsCount} meses</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="py-1 text-left">Categoria</th><th className="text-right">{yearA}</th><th className="text-right">{yearB}</th><th className="text-right">Δ</th></tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <>
              <tr key={g.grupo}><td colSpan={4} className="pt-3 text-xs font-semibold uppercase text-muted-foreground">{g.grupo}</td></tr>
              {g.itens.map((r) => (
                <tr key={g.grupo + r.categoria} className="border-t border-border/50">
                  <td className="py-1">{r.categoria}</td>
                  <td className="text-right tabular-nums">{formatBRL(r.a)}</td>
                  <td className="text-right tabular-nums">{formatBRL(r.b)}</td>
                  <td className="text-right tabular-nums">{delta(r.a, r.b)}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/YoyTable.tsx
git commit -m "components: YoyTable (year-over-year comparison)"
```

---

### Task 16: `RetencaoCard`

**Files:**
- Create: `src/components/RetencaoCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { Mes } from "@/types";
import { retencao } from "@/lib/metrics";

export function RetencaoCard({ meses, yearA, yearB }: { meses: Mes[]; yearA: number; yearB: number }) {
  const r = retencao(meses, yearA, yearB);
  const pct = r.totalAnoAnterior > 0 ? ((r.retidos / r.totalAnoAnterior) * 100).toFixed(0) : "—";
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Retenção de contribuintes</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Retidos</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-success">{r.retidos}</div>
          <div className="text-xs text-muted-foreground">{pct}% de {yearA}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Novos em {yearB}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-primary">{r.novos}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Saíram</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{r.sairam}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RetencaoCard.tsx
git commit -m "components: RetencaoCard (3 retention metrics)"
```

---

### Task 17: `YearAccordion` — collapsible month-cards group

**Files:**
- Create: `src/components/YearAccordion.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Mes } from "@/types";
import { MonthCard } from "./MonthCard";
import { cn } from "@/lib/utils";

export function YearAccordion({ year, meses, defaultOpen }: { year: number; meses: Mes[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (meses.length === 0) return null;
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between rounded border bg-card px-4 py-2 text-left text-sm font-semibold hover:bg-accent/20"
      >
        <span>{year} · {meses.length} {meses.length === 1 ? "mês" : "meses"}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meses.map((m) => <MonthCard key={m.ref} mes={m} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/YearAccordion.tsx
git commit -m "components: YearAccordion (collapsible month groups)"
```

---

## Phase D — Home page + deploy

### Task 18: Restructure `Home.tsx`

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Rewrite Home.tsx**

```tsx
import { Building2 } from "lucide-react";
import monthly from "@/data/monthly.json";
import type { Mes } from "@/types";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { ContribChart } from "@/components/ContribChart";
import { SaldoAcumuladoChart } from "@/components/SaldoAcumuladoChart";
import { CategoriaDonut } from "@/components/CategoriaDonut";
import { YoyTable } from "@/components/YoyTable";
import { RetencaoCard } from "@/components/RetencaoCard";
import { YearAccordion } from "@/components/YearAccordion";
import { formatBRL } from "@/lib/currency";
import {
  contribuintesAtivosPorMes,
  composicaoEntradas,
  composicaoSaidas,
  ytdComparavel,
} from "@/lib/metrics";

const meses = monthly as Mes[];

function yoyDelta(a: number, b: number): string {
  if (a === 0) return "—";
  return `${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(1)}%`;
}

export default function Home() {
  const atual = meses[meses.length - 1];
  const currentYear = Number(atual.ref.slice(0, 4));
  const prevYear = currentYear - 1;
  const { yearA, yearB } = ytdComparavel(meses, prevYear, currentYear);
  const sumEntradas = (ms: Mes[]) => ms.reduce((a, m) => a + m.entradas.totais.geral, 0);
  const sumSaidas = (ms: Mes[]) => ms.reduce((a, m) => a + m.saidas.total, 0);
  const ativos = contribuintesAtivosPorMes(meses);
  const ativosAtual = ativos[ativos.length - 1];
  const ativosAnt = ativos[ativos.length - 2];

  const entAnoAnt = sumEntradas(yearA);
  const entAnoAtual = sumEntradas(yearB);
  const saiAnoAnt = sumSaidas(yearA);
  const saiAnoAtual = sumSaidas(yearB);
  const sustentoYTD = yearB.reduce((a, m) => a + m.saidas.sustentoMinisterial, 0);
  const pctSustento = entAnoAtual > 0 ? ((sustentoYTD / entAnoAtual) * 100).toFixed(0) : "—";

  const byYear: Record<number, Mes[]> = {};
  for (const m of meses) {
    const y = Number(m.ref.slice(0, 4));
    (byYear[y] ||= []).push(m);
  }
  const years = Object.keys(byYear).map(Number).sort().reverse();

  return (
    <div className="container py-10">
      <header className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Tesouraria PIB Confins</h1>
            <p className="text-sm text-muted-foreground">
              Relatórios financeiros mensais · {meses[0].nome} a {atual.nome}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Saldo atual" value={formatBRL(atual.resumo.novoSaldo)} sub={`fim de ${atual.nome}`} />
        <KpiTile label={`Contribuintes ${atual.nome.split("/")[0]}`} value={String(ativosAtual.total)} sub={ativosAnt ? `${ativosAtual.total - ativosAnt.total >= 0 ? "+" : ""}${ativosAtual.total - ativosAnt.total} vs mês ant.` : ""} />
        <KpiTile label={`Entradas YTD ${currentYear}`} value={formatBRL(entAnoAtual)} sub={`${yoyDelta(entAnoAnt, entAnoAtual)} vs ${prevYear}`} tone="positive" />
        <KpiTile label={`Saídas YTD ${currentYear}`} value={formatBRL(saiAnoAtual)} sub={`${yoyDelta(saiAnoAnt, saiAnoAtual)} vs ${prevYear}`} tone="negative" />
        <KpiTile label="Sustento min. / entradas" value={`${pctSustento}%`} sub={`${formatBRL(sustentoYTD)} YTD`} />
        <KpiTile label={`Saldo ${prevYear}→${currentYear}`} value={formatBRL(atual.resumo.novoSaldo - (meses.find((m) => m.ref === `${prevYear}-01`)?.saldoAnterior ?? 0))} sub="variação de caixa" />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Entradas vs saídas por mês</h2>
        <div className="rounded-lg border bg-card p-4"><TrendChart meses={meses} /></div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Contribuintes ativos por mês</h2>
          <ContribChart meses={meses} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Saldo acumulado</h2>
          <SaldoAcumuladoChart meses={meses} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <YoyTable meses={meses} yearA={prevYear} yearB={currentYear} />
        <RetencaoCard meses={meses} yearA={prevYear} yearB={currentYear} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <CategoriaDonut data={composicaoEntradas(meses, currentYear)} title={`Composição de entradas — ${currentYear} YTD`} />
        <CategoriaDonut data={composicaoSaidas(meses, currentYear)} title={`Composição de saídas — ${currentYear} YTD`} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Relatórios por mês</h2>
        {years.map((y) => (
          <YearAccordion key={y} year={y} meses={byYear[y]} defaultOpen={y === currentYear} />
        ))}
      </section>

      <footer className="mt-12 border-t pt-6 text-xs text-muted-foreground">
        <p>
          Dados extraídos dos Relatórios Financeiros assinados na reunião mensal de contagem.
          Primeira Igreja Batista de Confins · CNPJ 16.534.166/0001-28
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: all metrics tests pass.

- [ ] **Step 3: Regenerate monthly.json**

Run: `python3 scripts/build_data.py`
Expected: `Wrote src/data/monthly.json (15 months).`

- [ ] **Step 4: Local dev check**

Run: `npm run dev`
Open `http://localhost:5173/pibconfins/` and verify:
  - 6 KPI tiles render with real numbers
  - Bar chart spans 15 months
  - Line chart of active contributors renders
  - Area chart of accumulated balance renders
  - YoY table has non-zero rows
  - Retention card shows 3 numbers
  - Two donuts render (entradas + saídas)
  - Month cards appear under two accordions (2025 collapsed, 2026 expanded)
  - Clicking any 2025 month card opens a detail page without errors

Note any visual issues and fix before committing. If layout breaks on mobile, adjust grid classes.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx src/data/monthly.json
git commit -m "dashboard: reestrutura Home com KPIs de crescimento + 2025 history"
```

---

### Task 19: Deploy

- [ ] **Step 1: Push to main**

```bash
cd ~/Projects/amiticia/repositories/pibconfins-site
git push origin main
```

- [ ] **Step 2: Watch deploy**

Run: `gh run watch` (or `gh run list` and watch the latest)
Expected: deploy workflow completes in ~2 min.

- [ ] **Step 3: Production smoke check**

Open `https://amiticia.cc/pibconfins/` in a browser and repeat the visual checks from Task 18 Step 4. Confirm numbers match local.

- [ ] **Step 4: Push Finance repo**

```bash
cd ~/Data/Documents/Finance
git push
```

---

## Self-review checklist

- [x] **Spec coverage:**
  - Ingestion approach (convert xlsx → 12 .md) → Tasks 1–8
  - Full names privacy (2025 same as 2026) → handled in render_md (Task 6)
  - KPI: active contributors → Task 9 + ContribChart + Home KPI tile
  - KPI: retention → Task 11 + RetencaoCard
  - KPI: YoY comparison → Task 10 + YoyTable + Home KPI tiles
  - KPI: accumulated balance → Task 13 (SaldoAcumuladoChart)
  - Category donuts → Task 14 + composições in Task 10
  - No separate /insights route → all on Home (Task 18)

- [x] **Placeholder scan:** No TBD, TODO, "implement later", "similar to Task N" without repetition.

- [x] **Type consistency:** `CategoriaValor` used consistently; `Retencao` shape matches across `metrics.ts` and `RetencaoCard`; `AtivosMes` used in ContribChart; `Mes` unchanged throughout.

- [x] **Commit cadence:** Each task commits; the plan produces ~15 small commits.

## Key conventions

- **TDD for data code:** all `metrics.ts` functions and xlsx extractors have failing tests first.
- **Visual QA for components:** defer full UI check to Task 18, but each component commits in isolation so it can be reviewed via PR.
- **Reconciliation as the hard gate:** the conversion script asserts annual totals match the global sheet (R$ 104.539,56 / R$ 92.137,54). If this fails, STOP and investigate.
- **DRY:** `CategoriaDonut` is reused for entradas + saídas. `composicaoEntradas` / `composicaoSaidas` share pattern but have different fields, so kept as two functions (not worth parameterizing).
- **YAGNI:** no cohort retention visualization, no separate insights route, no schema changes, no changes to `build_data.py`.
