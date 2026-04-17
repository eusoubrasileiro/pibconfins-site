import { Fragment } from "react";
import { Info } from "lucide-react";
import type { Mes } from "@/types";
import { composicaoEntradas, composicaoSaidas, ytdComparavel } from "@/lib/metrics";
import { formatBRL } from "@/lib/currency";

// Categorias cujo YoY é afetado por diferimentos conhecidos (regime de caixa vs competência).
const YOY_NOTES: Record<string, string> = {
  "Sustento Ministerial":
    "O Sustento de Março/2025 foi contabilizado com atraso em Maio/2025 ('Prebenda Março/2025'). Por isso o acumulado Jan–Mar de 2025 exclui esse valor e a variação YoY fica distorcida.",
};

function delta(a: number, b: number): { text: string; title?: string } {
  if (a === 0) {
    if (b === 0) return { text: "—" };
    return { text: `novo +${formatBRL(b)}`, title: "Sem valor registrado no ano anterior" };
  }
  const pct = ((b - a) / Math.abs(a)) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
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
              {g.itens.map((r) => {
                const d = delta(r.a, r.b);
                const note = YOY_NOTES[r.categoria];
                return (
                  <tr key={g.grupo + r.categoria} className="border-t border-border/50">
                    <td className="py-1">
                      {note ? (
                        <span className="inline-flex items-center gap-1" title={note}>
                          {r.categoria}
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </span>
                      ) : (
                        r.categoria
                      )}
                    </td>
                    <td className="text-right tabular-nums">{formatBRL(r.a)}</td>
                    <td className="text-right tabular-nums">{formatBRL(r.b)}</td>
                    <td className="text-right tabular-nums" title={d.title}>{d.text}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
