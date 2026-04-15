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


def test_membros_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_membros
    total_ano = 0.0
    for idx in range(2, 14):
        _, tot = extract_membros(wb.worksheets[idx])
        total_ano += tot
    # Global sheet row 3 col O (annual total dizimos)
    assert round(total_ano, 2) == 35316.00


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


def test_nao_membros_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_nao_membros
    total_ano = 0.0
    for idx in range(2, 14):
        _, tot = extract_nao_membros(wb.worksheets[idx])
        total_ano += tot
    # Global row 8 col O
    assert round(total_ano, 2) == 54135.66
