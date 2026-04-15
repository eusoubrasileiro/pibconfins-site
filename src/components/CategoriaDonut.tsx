import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaValor } from "@/lib/metrics";
import { formatBRL } from "@/lib/currency";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142 76% 36%)",
  "hsl(48 96% 53%)",
  "hsl(350 80% 60%)",
  "hsl(260 60% 60%)",
  "hsl(200 70% 50%)",
  "hsl(25 85% 55%)",
  "hsl(180 50% 45%)",
];

export function CategoriaDonut({ data, title }: { data: CategoriaValor[]; title: string }) {
  const nonZero = data.filter((d) => d.valor > 0);
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={nonZero} dataKey="valor" nameKey="categoria" innerRadius={50} outerRadius={85} paddingAngle={2}>
              {nonZero.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
