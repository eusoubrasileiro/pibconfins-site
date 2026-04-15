import { Fragment } from "react";
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
            <Fragment key={g.grupo}>
              <tr><td colSpan={4} className="pt-3 text-xs font-semibold uppercase text-muted-foreground">{g.grupo}</td></tr>
              {g.itens.map((r) => (
                <tr key={g.grupo + r.categoria} className="border-t border-border/50">
                  <td className="py-1">{r.categoria}</td>
                  <td className="text-right tabular-nums">{formatBRL(r.a)}</td>
                  <td className="text-right tabular-nums">{formatBRL(r.b)}</td>
                  <td className="text-right tabular-nums">{delta(r.a, r.b)}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
