#!/usr/bin/env python3
"""Build src/data/monthly.json from the Tesouraria-PIB-Confins relatorio_mensal_*.md files.

Usage:
    python3 scripts/build_data.py [--source PATH] [--check]

--source  Finance/Tesouraria-PIB-Confins root (default: ~/Data/Documents/Finance/Tesouraria-PIB-Confins)
--check   parse + validate only, don't write output

The script is regex-based rather than a full markdown parser because the template
is stable and table shape is known. If a month ever deviates it will raise loudly.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

HOME_DEFAULT = Path.home() / "Data/Documents/Finance/Tesouraria-PIB-Confins"
OUTPUT = Path(__file__).resolve().parent.parent / "src/data/monthly.json"

MONTH_NAMES = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
}


def parse_brl(s: str) -> float | None:
    """'1.234,56' -> 1234.56; '-R$ 2.439,13' -> -2439.13; '—' / empty -> None."""
    s = s.strip().replace("R$", "").strip()
    if not s or s in ("—", "-", "–"):
        return None
    negative = s.startswith("-")
    if negative:
        s = s[1:].strip()
    # Remove thousand separators '.', convert decimal ',' to '.'
    s = s.replace(".", "").replace(",", ".")
    try:
        v = float(s)
        return -v if negative else v
    except ValueError:
        return None


@dataclass
class Contribuinte:
    nome: str
    valor: float | None


@dataclass
class Saidas:
    plano_cooperativo: float = 0.0
    zeladoria: float = 0.0
    sustento_ministerial: float = 0.0
    missoes: float | None = None
    copasa: float = 0.0
    cemig: float | None = None
    manutencao: float | None = None
    despesas_eventuais: float | None = None
    outros: list[dict] = field(default_factory=list)
    total: float = 0.0


def parse_tabela_pessoas(md: str, header: str) -> tuple[list[Contribuinte], float]:
    """Extract a person/value table bounded by the header ('ENTRADAS — Membros' etc.)."""
    start = md.index(f"## {header}")
    # table ends at next ##
    end = md.index("\n## ", start + 1)
    block = md[start:end]
    # rows: | n | Name | Valor |
    row_re = re.compile(r"^\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$", re.MULTILINE)
    total_re = re.compile(r"TOTAL[^|]*\|\s*\*{0,2}\s*(R?\$?\s*[\d.,—\-]+)\s*\*{0,2}\s*\|", re.IGNORECASE)
    pessoas = [Contribuinte(m.group(1).strip(), parse_brl(m.group(2))) for m in row_re.finditer(block)]
    total_match = total_re.search(block)
    total = parse_brl(total_match.group(1)) if total_match else 0.0
    return pessoas, total or 0.0


def parse_ofertas(md: str) -> tuple[dict, float]:
    start = md.index("## OFERTAS")
    end = md.index("\n## ", start + 1)
    block = md[start:end]
    ofertas = {"anonimas": None, "missoes": None, "recantoVida": None, "beneficencia": None, "outros": None}
    patterns = {
        "anonimas": r"Anônimas\s*\|\s*([^|]+?)\s*\|",
        "missoes": r"Missões\s*\|\s*([^|]+?)\s*\|",
        "recantoVida": r"Recanto Vida\s*\|\s*([^|]+?)\s*\|",
        "beneficencia": r"Beneficência\s*\|\s*([^|]+?)\s*\|",
        "outros": r"Outros[^|]*\|\s*([^|]+?)\s*\|",
    }
    for key, pat in patterns.items():
        m = re.search(pat, block)
        if m:
            ofertas[key] = parse_brl(m.group(1))
    total_match = re.search(r"TOTAL OFERTAS[^|]*\|\s*\*{0,2}\s*([^|*]+?)\s*\*{0,2}\s*\|", block)
    total = parse_brl(total_match.group(1)) if total_match else 0.0
    return ofertas, total or 0.0


def parse_entrada_geral(md: str) -> dict:
    start = md.index("## ENTRADA GERAL")
    end = md.index("\n## ", start + 1)
    block = md[start:end]
    result = {}
    for key, pat in [
        ("saldoAnterior", r"Saldo Recorrente do Mês Anterior\s*\|\s*([^|]+?)\s*\|"),
        ("totalMes", r"Total de Entradas Deste Mês\s*\|\s*([^|]+?)\s*\|"),
        ("somatorio", r"Somatório Geral de Entradas\*?\*?\s*\|\s*\*{0,2}\s*([^|*]+?)\s*\*{0,2}\s*\|"),
    ]:
        m = re.search(pat, block)
        result[key] = parse_brl(m.group(1)) if m else None
    return result


STANDARD_SAIDA_LABELS: dict[str, re.Pattern[str]] = {
    "plano_cooperativo": re.compile(r"^Plano Cooperativo$"),
    "zeladoria": re.compile(r"^Zeladoria(\s*\([^)]*\))?$"),
    "sustento_ministerial": re.compile(r"^Sustento Ministerial$"),
    "missoes": re.compile(r"^Missões$"),
    "copasa": re.compile(r"^COPASA$"),
    "cemig": re.compile(r"^CEMIG(\s*\([^)]*\))?$"),
    "manutencao": re.compile(r"^Manutenção e Limpeza$"),
    "despesas_eventuais": re.compile(r"^Despesas Eventuais(\s*\([^)]*\))?$"),
}
OUTROS_STD = re.compile(r"^Outros(\s*\(([^)]*)\))?$")
SCALAR_ZERO_DEFAULT = {"plano_cooperativo", "zeladoria", "sustento_ministerial", "copasa"}


def parse_saidas(md: str) -> Saidas:
    start = md.index("## SAÍDAS")
    end = md.index("\n## ", start + 1)
    block = md[start:end]
    s = Saidas()
    # Iterate every data row in the table; assign to a standard slot if the label
    # matches exactly, otherwise append as a labelled "outros" line item.
    row_re = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$", re.MULTILINE)
    for m in row_re.finditer(block):
        label = m.group(1).strip()
        val_str = m.group(2).strip()
        if (not label or label.startswith("---") or label.startswith("**")
                or label == "Especificação" or label.upper().startswith("TOTAL")):
            continue
        value = parse_brl(val_str)
        slot = next((k for k, pat in STANDARD_SAIDA_LABELS.items() if pat.match(label)), None)
        if slot:
            if value is None and slot in SCALAR_ZERO_DEFAULT:
                setattr(s, slot, 0.0)
            else:
                setattr(s, slot, value)
            continue
        om = OUTROS_STD.match(label)
        if om:
            desc = (om.group(2) or "").strip() or "Outros"
            if value is not None:
                s.outros.append({"descricao": desc, "valor": value})
            continue
        if value is not None:
            s.outros.append({"descricao": label, "valor": value})
    total_match = re.search(r"TOTAL SAÍDAS[^|]*\|\s*\*{0,2}\s*([^|*]+?)\s*\*{0,2}\s*\|", block)
    s.total = parse_brl(total_match.group(1)) if total_match else 0.0
    return s


def parse_resumo(md: str) -> dict:
    start = md.index("## RESUMO DE CAIXA")
    end_idx = md.find("\n## ", start + 1)
    end = end_idx if end_idx != -1 else len(md)
    block = md[start:end]
    result = {}
    # Capture value between pipes verbatim; parse_brl handles both `-R$ X` and `R$ -X`.
    for key, pat in [
        ("saldoMes", r"Saldo do Mês\*?\*?\s*\|\s*\*{0,2}\s*([^|*]+?)\s*\*{0,2}\s*\|"),
        ("novoSaldo", r"Novo Saldo Para o Próximo Mês\*?\*?\s*\|\s*\*{0,2}\s*([^|*]+?)\s*\*{0,2}\s*\|"),
    ]:
        m = re.search(pat, block)
        result[key] = parse_brl(m.group(1)) if m else None
    return result


def parse_mes(md: str, ref: str) -> dict:
    membros, total_membros = parse_tabela_pessoas(md, "ENTRADAS — Membros")
    nao_membros, total_nm = parse_tabela_pessoas(md, "ENTRADAS — Não Membros")
    ofertas, total_ofertas = parse_ofertas(md)
    entrada_geral = parse_entrada_geral(md)
    saidas = parse_saidas(md)
    resumo = parse_resumo(md)

    # Validation: sum of individual lines should match the printed total
    soma_m = sum(c.valor or 0 for c in membros)
    soma_nm = sum(c.valor or 0 for c in nao_membros)
    soma_of = sum(v or 0 for v in ofertas.values())

    flags = []
    for label, soma, total in [("membros", soma_m, total_membros),
                                ("naoMembros", soma_nm, total_nm),
                                ("ofertas", soma_of, total_ofertas)]:
        if abs(soma - total) > 0.01:
            flags.append({"campo": label, "motivo": f"soma {soma:.2f} ≠ total manuscrito {total:.2f}"})

    # Soma dos 3 blocos de entrada precisa bater com "Total de Entradas Deste Mês"
    soma_entradas = total_membros + total_nm + total_ofertas
    total_mes = entrada_geral.get("totalMes")
    if total_mes is not None and abs(soma_entradas - total_mes) > 0.01:
        flags.append({"campo": "totalEntradas",
                      "motivo": f"membros+naoMembros+ofertas {soma_entradas:.2f} ≠ Total de Entradas Deste Mês {total_mes:.2f}"})

    # Soma dos itens de saída (scalars + outros) precisa bater com TOTAL SAÍDAS
    scalar_saidas = sum((getattr(saidas, k) or 0.0) for k in (
        "plano_cooperativo", "zeladoria", "sustento_ministerial",
        "missoes", "copasa", "cemig", "manutencao", "despesas_eventuais"))
    soma_saidas_itens = scalar_saidas + sum(o["valor"] for o in saidas.outros)
    if abs(soma_saidas_itens - saidas.total) > 0.01:
        flags.append({"campo": "saidas",
                      "motivo": f"soma dos itens {soma_saidas_itens:.2f} ≠ TOTAL SAÍDAS {saidas.total:.2f}"})

    # Identidade contábil: saldoAnterior + entradas - saidas == novoSaldo
    sa = entrada_geral.get("saldoAnterior") or 0.0
    te = total_mes or 0.0
    calc_saldo_mes = te - saidas.total
    calc_novo = sa + calc_saldo_mes
    r_sm = resumo.get("saldoMes")
    r_ns = resumo.get("novoSaldo")
    if r_sm is not None and abs(calc_saldo_mes - r_sm) > 0.01:
        flags.append({"campo": "saldoMes",
                      "motivo": f"entradas-saidas = {calc_saldo_mes:.2f} ≠ Saldo do Mês {r_sm:.2f}"})
    if r_ns is not None and abs(calc_novo - r_ns) > 0.01:
        flags.append({"campo": "novoSaldo",
                      "motivo": f"saldoAnterior+entradas-saidas = {calc_novo:.2f} ≠ Novo Saldo {r_ns:.2f}"})

    month_name = MONTH_NAMES[ref.split("-")[1]]
    return {
        "ref": ref,
        "nome": f"{month_name}/{ref.split('-')[0]}",
        "saldoAnterior": entrada_geral["saldoAnterior"],
        "entradas": {
            "membros": [{"nome": c.nome, "valor": c.valor} for c in membros],
            "naoMembros": [{"nome": c.nome, "valor": c.valor} for c in nao_membros],
            "ofertas": ofertas,
            "totais": {
                "membros": total_membros,
                "naoMembros": total_nm,
                "ofertas": total_ofertas,
                "geral": entrada_geral["totalMes"],
            },
        },
        "saidas": {
            "planoCooperativo": saidas.plano_cooperativo,
            "zeladoria": saidas.zeladoria,
            "sustentoMinisterial": saidas.sustento_ministerial,
            "missoes": saidas.missoes,
            "copasa": saidas.copasa,
            "cemig": saidas.cemig,
            "manutencao": saidas.manutencao,
            "despesasEventuais": saidas.despesas_eventuais,
            "outros": saidas.outros,
            "total": saidas.total,
        },
        "resumo": resumo,
        "validacao": {
            "status": "ok" if not flags else "flagged",
            "flags": flags,
        },
    }


def find_monthly_reports(source: Path) -> list[tuple[str, Path]]:
    """Find all relatorio_mensal_YYYY-MM.md files under `source`, sorted by ref."""
    results = []
    for md in source.glob("*/relatorio_mensal_*.md"):
        m = re.search(r"relatorio_mensal_(\d{4}-\d{2})\.md$", md.name)
        if m:
            results.append((m.group(1), md))
    return sorted(results, key=lambda t: t[0])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=HOME_DEFAULT)
    ap.add_argument("--check", action="store_true", help="parse-only, no write")
    args = ap.parse_args()

    reports = find_monthly_reports(args.source)
    if not reports:
        print(f"ERROR: no relatorio_mensal_*.md files found under {args.source}", file=sys.stderr)
        return 2

    parsed = []
    print(f"Parsing {len(reports)} monthly reports from {args.source}:")
    for ref, path in reports:
        parsed.append(parse_mes(path.read_text(encoding="utf-8"), ref))

    # Chain check: previous month's novoSaldo must equal current month's saldoAnterior
    for prev, cur in zip(parsed, parsed[1:]):
        prev_novo = prev["resumo"].get("novoSaldo")
        cur_sa = cur.get("saldoAnterior")
        if prev_novo is not None and cur_sa is not None and abs(prev_novo - cur_sa) > 0.01:
            cur["validacao"]["flags"].append({
                "campo": "chainSaldo",
                "motivo": f"saldoAnterior {cur_sa:.2f} ≠ Novo Saldo de {prev['ref']} ({prev_novo:.2f})",
            })
            cur["validacao"]["status"] = "flagged"

    any_flagged = False
    for mes in parsed:
        status = mes["validacao"]["status"]
        if status != "ok":
            any_flagged = True
            print(f"  ⚠ {mes['ref']}: FLAGGED — {len(mes['validacao']['flags'])} inconsistência(s)")
            for f in mes["validacao"]["flags"]:
                print(f"      • {f['campo']}: {f['motivo']}")
        else:
            print(f"  ✓ {mes['ref']}: totais conferem")

    if args.check:
        print(f"\nCheck-only run. {'All OK.' if not any_flagged else 'Some months flagged.'}")
        return 0 if not any_flagged else 1

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUTPUT} ({len(parsed)} months).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
