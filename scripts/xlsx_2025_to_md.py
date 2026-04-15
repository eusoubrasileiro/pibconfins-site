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


def extract_ofertas(ws) -> tuple[dict, float]:
    ofertas = {k: cell_num(ws, row, COL_VALUE) for k, row in ROW_OFERTAS.items()}
    # Normalize None to 0.0 for ofertas (they have explicit 0 in xlsx, but be safe)
    ofertas = {k: (v if v is not None else 0.0) for k, v in ofertas.items()}
    total = cell_num(ws, ROW_TOTAL_OFERTAS, COL_VALUE) or 0.0
    return ofertas, total


def extract_entrada_geral(ws) -> dict:
    return {
        "saldoAnterior": cell_num(ws, ROW_SALDO_ANTERIOR, COL_SALDO_ANT),
        "totalMes": cell_num(ws, ROW_TOTAL_ENTRADAS_MES, COL_VALUE),
        "somatorio": cell_num(ws, ROW_SOMATORIO_ENTRADAS, COL_VALUE),
    }
