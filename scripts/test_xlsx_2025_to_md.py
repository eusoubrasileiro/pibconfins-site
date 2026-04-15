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
