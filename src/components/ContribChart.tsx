import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { contribuintesAtivosPorMes } from "@/lib/metrics";

function avgByYear(data: { ref: string; membros: number; naoMembros: number; total: number }[]) {
  const byYear: Record<number, { membros: number[]; naoMembros: number[]; total: number[] }> = {};
  for (const d of data) {
    const y = Number(d.ref.slice(0, 4));
    const bucket = (byYear[y] ||= { membros: [], naoMembros: [], total: [] });
    bucket.membros.push(d.membros);
    bucket.naoMembros.push(d.naoMembros);
    bucket.total.push(d.total);
  }
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  return Object.entries(byYear)
    .map(([y, v]) => ({ year: Number(y), membros: avg(v.membros), naoMembros: avg(v.naoMembros), total: avg(v.total) }))
    .sort((a, b) => a.year - b.year);
}

function DeltaBadge({ label, prev, curr }: { label: string; prev: number; curr: number }) {
  const diff = curr - prev;
  const color = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{prev}</span>
      <span className="text-muted-foreground">→</span>
      <span className="tabular-nums">{curr}</span>
      <span className={`font-medium tabular-nums ${color}`}>
        {diff > 0 ? "+" : ""}{diff}
      </span>
    </div>
  );
}

export function ContribChart({ meses, apresentacao = false }: { meses: Mes[]; apresentacao?: boolean }) {
  const raw = contribuintesAtivosPorMes(meses);
  const data = raw.map((d) => ({
    mes: d.ref,
    Membros: d.membros,
    "Não-Membros": d.naoMembros,
    Total: d.total,
  }));
  const avgs = avgByYear(raw);
  const showDelta = avgs.length >= 2;
  const prev = showDelta ? avgs[avgs.length - 2] : null;
  const curr = showDelta ? avgs[avgs.length - 1] : null;

  return (
    <div>
      {!apresentacao && showDelta && prev && curr && (
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="text-xs text-muted-foreground self-center">
            Média mensal {prev.year} → {curr.year}:
          </div>
          <DeltaBadge label="Membros" prev={prev.membros} curr={curr.membros} />
          <DeltaBadge label="Não-Membros" prev={prev.naoMembros} curr={curr.naoMembros} />
          <DeltaBadge label="Total" prev={prev.total} curr={curr.total} />
        </div>
      )}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="mes" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            <Legend />
            <Line type="monotone" dataKey="Membros" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line type="monotone" dataKey="Não-Membros" stroke="hsl(var(--accent))" strokeWidth={2} />
            <Line type="monotone" dataKey="Total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
