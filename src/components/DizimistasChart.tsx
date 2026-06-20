import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { membrosDizimistasPorMes } from "@/lib/metrics";

export function DizimistasChart({ meses }: { meses: Mes[] }) {
  const data = membrosDizimistasPorMes(meses).map((d) => ({
    mes: d.ref,
    "% dizimistas": Math.round(d.pct),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="mes" className="text-xs" />
          <YAxis domain={[0, 100]} unit="%" className="text-xs" />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            formatter={(v) => [`${v}%`, "Membros dizimistas"]}
          />
          <Line type="monotone" dataKey="% dizimistas" stroke="hsl(var(--primary))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
