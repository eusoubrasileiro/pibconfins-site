import { useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp, Activity } from "lucide-react";
import type { Mes } from "@/types";
import { formatBRL, formatBRLCompact } from "@/lib/currency";

type ViewMode = "area" | "bar";

function movingAvg(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += values[j];
    return Math.round(sum / window);
  });
}

export function TrendChart({ meses, apresentacao = false }: { meses: Mes[]; apresentacao?: boolean }) {
  const [view, setView] = useState<ViewMode>("area");
  const [showMA, setShowMA] = useState(false);

  const entradas = meses.map((m) => m.entradas.totais.geral);
  const saidas = meses.map((m) => m.saidas.total);
  const maEnt = movingAvg(entradas, 3);
  const maSai = movingAvg(saidas, 3);

  const data = meses.map((m, i) => ({
    mes: m.nome.split("/")[0],
    Entradas: m.entradas.totais.geral,
    Saídas: m.saidas.total,
    "MM3 Entradas": maEnt[i],
    "MM3 Saídas": maSai[i],
  }));

  const margin = { top: 20, right: 30, left: 8, bottom: 8 };
  const tooltipStyle = { borderRadius: 8, border: "1px solid hsl(var(--border))" };

  return (
    <div>
      {!apresentacao && (
        <div className="mb-2 flex justify-end gap-1">
          <button
            onClick={() => setShowMA((v) => !v)}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${showMA ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Média móvel de 3 meses"
          >
            <Activity className="h-3.5 w-3.5" />
            MM3
          </button>
          <div className="mx-1 border-l" />
          <button
            onClick={() => setView("area")}
            className={`rounded p-1.5 transition-colors ${view === "area" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Gráfico de área"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("bar")}
            className={`rounded p-1.5 transition-colors ${view === "bar" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Gráfico de barras"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === "area" ? (
            <ComposedChart data={data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
              <Legend />
              <Area type="monotone" dataKey="Entradas" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="Saídas" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" strokeWidth={2} />
              {showMA && (
                <Line type="monotone" dataKey="MM3 Entradas" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="6 3" dot={false} connectNulls />
              )}
              {showMA && (
                <Line type="monotone" dataKey="MM3 Saídas" stroke="hsl(var(--accent))" strokeWidth={3} strokeDasharray="6 3" dot={false} connectNulls />
              )}
            </ComposedChart>
          ) : (
            <BarChart data={data} margin={margin}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="mes" className="text-xs" />
              <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
              <Legend />
              <Bar dataKey="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
