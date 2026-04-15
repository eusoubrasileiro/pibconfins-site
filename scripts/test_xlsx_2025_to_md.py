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


def test_saidas_soma_bate_total_anual(wb):
    from xlsx_2025_to_md import extract_saidas
    total_ano = 0.0
    for idx in range(2, 14):
        s = extract_saidas(wb.worksheets[idx])
        total_ano += s["total"]
    assert round(total_ano, 2) == 92137.54


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
