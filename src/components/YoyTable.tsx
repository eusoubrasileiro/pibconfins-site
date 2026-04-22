import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Mes } from "@/types";
import { composicaoEntradas, composicaoSaidasAgrupada, ytdComparavel } from "@/lib/metrics";
import { formatBRL } from "@/lib/currency";
import { cn } from "@/lib/utils";

function delta(a: number, b: number): { text: string; title?: string } {
  if (a === 0) {
    if (b === 0) return { text: "—" };
    return { text: `novo`, title: `Sem valor em ano anterior. Atual: ${formatBRL(b)}` };
  }
  const pct = ((b - a) / Math.abs(a)) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
}

export function YoyTable({ meses, yearA, yearB, apresentacao = false }: { meses: Mes[]; yearA: number; yearB: number; apresentacao?: boolean }) {
  const [expanded, setExpanded] = useState(!apresentacao);
  const { yearA: mesesA, yearB: mesesB } = ytdComparavel(meses, yearA, yearB);
  const n = mesesB.length;
  const entA = composicaoEntradas(mesesA, yearA);
  const entB = composicaoEntradas(mesesB, yearB);
  const saiA = composicaoSaidasAgrupada(mesesA, yearA);
  const saiB = composicaoSaidasAgrupada(mesesB, yearB);

  const totalEntA = entA.reduce((s, r) => s + r.valor, 0) / n;
  const totalEntB = entB.reduce((s, r) => s + r.valor, 0) / n;
  const totalSaiA = saiA.reduce((s, r) => s + r.valor, 0) / n;
  const totalSaiB = saiB.reduce((s, r) => s + r.valor, 0) / n;

  const rows = [
    { grupo: "Entradas", itens: entA.map((r) => {
      const bMatch = entB.find((b) => b.categoria === r.categoria);
      return { categoria: r.categoria, a: r.valor / n, b: (bMatch?.valor ?? 0) / n };
    })},
    { grupo: "Saídas", itens: saiA.map((r) => {
      const bMatch = saiB.find((b) => b.categoria === r.categoria);
      return { categoria: r.categoria, a: r.valor / n, b: (bMatch?.valor ?? 0) / n };
    })},
  ];

  const summaryRows = apresentacao
    ? [
        { categoria: "Total entradas", a: totalEntA, b: totalEntB },
        { categoria: "Total saídas", a: totalSaiA, b: totalSaiB },
      ]
    : [
        { categoria: "Total entradas", a: totalEntA, b: totalEntB },
        { categoria: "Total saídas", a: totalSaiA, b: totalSaiB },
        { categoria: "Saldo mensal", a: totalEntA - totalSaiA, b: totalEntB - totalSaiB },
      ];

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-1 text-sm font-semibold">Comparativo anual — média mensal</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Primeiros {n} meses (Jan–{mesesB[n - 1]?.nome.split("/")[0]})
      </p>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1 text-left">Categoria</th>
            <th className="text-right">{yearA}</th>
            <th className="text-right">{yearB}</th>
            {!apresentacao && <th className="text-right">Δ</th>}
          </tr>
        </thead>
        <tbody>
          {summaryRows.map((r) => {
            const d = delta(r.a, r.b);
            const isSaldo = r.categoria === "Saldo mensal";
            return (
              <tr key={r.categoria} className={cn("border-t border-border/50", isSaldo && "font-semibold")}>
                <td className="py-1">{r.categoria}</td>
                <td className="text-right tabular-nums">{formatBRL(r.a)}</td>
                <td className="text-right tabular-nums">{formatBRL(r.b)}</td>
                {!apresentacao && <td className="text-right tabular-nums" title={d.title}>{d.text}</td>}
              </tr>
            );
          })}
          {expanded && rows.map((g) => (
            <Fragment key={g.grupo}>
              <tr><td colSpan={apresentacao ? 3 : 4} className="pt-3 text-xs font-semibold uppercase text-muted-foreground">{g.grupo}</td></tr>
              {g.itens.map((r) => {
                const d = delta(r.a, r.b);
                return (
                  <tr key={g.grupo + r.categoria} className="border-t border-border/50">
                    <td className="py-1 pl-2 text-muted-foreground">{r.categoria}</td>
                    <td className="text-right tabular-nums text-muted-foreground">{formatBRL(r.a)}</td>
                    <td className="text-right tabular-nums text-muted-foreground">{formatBRL(r.b)}</td>
                    {!apresentacao && <td className="text-right tabular-nums text-muted-foreground" title={d.title}>{d.text}</td>}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!apresentacao && (
        <button
          type="button"
          onClick={() => setExpanded((o) => !o)}
          className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>{expanded ? "Ocultar detalhes" : "Ver detalhes por categoria"}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
