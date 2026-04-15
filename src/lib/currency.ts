const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return BRL.format(value);
}

export function formatBRLCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} k`;
  }
  return BRL.format(value);
}
