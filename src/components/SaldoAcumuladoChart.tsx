import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Mes } from "@/types";
import { formatBRL, formatBRLCompact } from "@/lib/currency";

export function SaldoAcumuladoChart({ meses }: { meses: Mes[] }) {
  const data = meses.map((m) => ({ mes: m.ref, Saldo: m.resumo.novoSaldo }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="mes" className="text-xs" />
          <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
          <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
          <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
