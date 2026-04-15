import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { contribuintesAtivosPorMes } from "@/lib/metrics";

export function ContribChart({ meses }: { meses: Mes[] }) {
  const data = contribuintesAtivosPorMes(meses).map((d) => ({
    mes: d.ref,
    Membros: d.membros,
    "Não-Membros": d.naoMembros,
    Total: d.total,
  }));
  return (
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
  );
}
