import type { Mes } from "@/types";
import { retencao } from "@/lib/metrics";

export function RetencaoCard({ meses, yearA, yearB }: { meses: Mes[]; yearA: number; yearB: number }) {
  const r = retencao(meses, yearA, yearB);
  const pctRetidos = r.totalAnoAnterior > 0 ? Math.round((r.retidos / r.totalAnoAnterior) * 100) : 0;
  const totalAtual = r.retidos + r.novos;
  const totalBar = r.retidos + r.novos + r.sairam;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-1 text-sm font-semibold">Retenção de contribuintes</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Quem contribuiu em {yearA} ({r.totalAnoAnterior}) vs {yearB} até agora ({totalAtual})
      </p>

      <div className="mb-4 text-center">
        <div className="text-4xl font-bold tabular-nums text-success">{pctRetidos}%</div>
        <div className="mt-1 text-sm text-muted-foreground">
          retenção {yearA} → {yearB}
        </div>
      </div>

      {totalBar > 0 && (
        <>
          <div className="mb-1 flex h-3 overflow-hidden rounded-full">
            <div className="bg-success transition-all" style={{ width: `${(r.retidos / totalBar) * 100}%` }} />
            <div className="bg-primary transition-all" style={{ width: `${(r.novos / totalBar) * 100}%` }} />
            <div className="bg-destructive/60 transition-all" style={{ width: `${(r.sairam / totalBar) * 100}%` }} />
          </div>
          <div className="mb-4 flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-success" /> Retidos
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Novos
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive/60" /> Saíram
            </span>
          </div>
        </>
      )}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Retidos</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-success">{r.retidos}</div>
          <div className="text-xs text-muted-foreground">{pctRetidos}% de {yearA}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Novos em {yearB}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-primary">{r.novos}</div>
          <div className="text-xs text-muted-foreground">1ª contribuição</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Saíram</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">{r.sairam}</div>
          <div className="text-xs text-muted-foreground">sem contribuição em {yearB}</div>
        </div>
      </div>
    </div>
  );
}
