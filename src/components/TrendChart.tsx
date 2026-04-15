import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { formatBRL, formatBRLCompact } from "@/lib/currency";

export function TrendChart({ meses }: { meses: Mes[] }) {
  const data = meses.map((m) => ({
    mes: m.nome.split("/")[0],
    Entradas: m.entradas.totais.geral,
    Saídas: m.saidas.total,
    Saldo: m.resumo.novoSaldo,
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="mes" className="text-xs" />
          <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            formatter={(value: number) => formatBRL(value)}
          />
          <Legend />
          <Bar dataKey="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Saídas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
