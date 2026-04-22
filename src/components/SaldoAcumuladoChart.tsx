import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Mes } from "@/types";
import { formatBRL, formatBRLCompact } from "@/lib/currency";

const SUSTENTO_REF = "2025-04";
const SUSTENTO_LABEL = "Início do auto-sustento";
const SUSTENTO_TOOLTIP =
  "A partir de Abr/2025 a congregação assumiu o sustento ministerial integral (R$ 5.700/mês). " +
  "Antes, apenas R$ 1.500/mês era pago pela congregação. A queda no saldo reflete essa nova responsabilidade.";

function linearRegression(values: number[]) {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept, predict: (i: number) => Math.round(intercept + slope * i) };
}

function futureMonths(lastRef: string, count: number): string[] {
  const [y, m] = lastRef.split("-").map(Number);
  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    const totalM = m + i;
    const ny = y + Math.floor((totalM - 1) / 12);
    const nm = ((totalM - 1) % 12) + 1;
    result.push(`${ny}-${String(nm).padStart(2, "0")}`);
  }
  return result;
}

function ToggleBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
      title={title}
    >
      {children}
    </button>
  );
}

export function SaldoAcumuladoChart({ meses, apresentacao = false }: { meses: Mes[]; apresentacao?: boolean }) {
  const [showTrend, setShowTrend] = useState(false);
  const [showProj, setShowProj] = useState(false);
  const saldos = meses.map((m) => m.resumo.novoSaldo);
  const reg = linearRegression(saldos);

  const lastRef = meses[meses.length - 1].ref;
  const lastYear = Number(lastRef.slice(0, 4));
  const lastMonth = Number(lastRef.slice(5));
  const projectMonths = (12 - lastMonth) + 12;
  const projected = futureMonths(lastRef, projectMonths);

  const realData = meses.map((m, i) => ({
    mes: m.ref,
    Saldo: m.resumo.novoSaldo,
    Tendência: showTrend || showProj ? reg.predict(i) : null,
    Projeção: null as number | null,
  }));

  const projData = projected.map((ref, j) => ({
    mes: ref,
    Saldo: null as number | null,
    Tendência: null as number | null,
    Projeção: showProj ? reg.predict(meses.length + j) : null,
  }));

  if (showProj && realData.length > 0) {
    realData[realData.length - 1].Projeção = realData[realData.length - 1].Saldo;
  }

  const data = showProj ? [...realData, ...projData] : realData;
  const endOfYearIdx = meses.length + (12 - lastMonth);
  const projEndYear = reg.predict(endOfYearIdx - 1);
  const projEndNext = reg.predict(meses.length + projectMonths - 1);

  return (
    <div>
      {!apresentacao && (
        <div className="mb-2 flex items-center justify-between">
          {showProj ? (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Crescimento: <strong className="text-foreground">{formatBRL(reg.slope)}/mês</strong>
              </span>
              <span>
                Dez/{lastYear}: <strong className="text-foreground">{formatBRL(projEndYear)}</strong>
              </span>
              <span>
                Dez/{lastYear + 1}: <strong className="text-foreground">{formatBRL(projEndNext)}</strong>
              </span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-1">
            <ToggleBtn active={showTrend} onClick={() => setShowTrend((v) => !v)} title="Linha de tendência linear">
              <TrendingUp className="h-3.5 w-3.5" />
              Tendência
            </ToggleBtn>
            <ToggleBtn active={showProj} onClick={() => setShowProj((v) => !v)} title="Projeção até Dez/{lastYear + 1}">
              <ArrowRight className="h-3.5 w-3.5" />
              Projeção
            </ToggleBtn>
          </div>
        </div>
      )}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="mes" className="text-xs" />
            <YAxis tickFormatter={(v) => formatBRLCompact(v)} className="text-xs" width={80} />
            <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            {!apresentacao && (
              <ReferenceLine
                x={SUSTENTO_REF}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
                label={{ value: SUSTENTO_LABEL, position: "top", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              >
                <title>{SUSTENTO_TOOLTIP}</title>
              </ReferenceLine>
            )}
            <Area type="monotone" dataKey="Saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
            {(showTrend || showProj) && (
              <Line type="monotone" dataKey="Tendência" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            )}
            {showProj && (
              <Line type="monotone" dataKey="Projeção" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!apresentacao && (
        <p className="mt-1 text-center text-[10px] text-muted-foreground" title={SUSTENTO_TOOLTIP}>
          Linha tracejada vermelha vertical = início do auto-sustento (Abr/2025)
        </p>
      )}
    </div>
  );
}
