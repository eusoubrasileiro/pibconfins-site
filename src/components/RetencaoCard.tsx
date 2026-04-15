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
