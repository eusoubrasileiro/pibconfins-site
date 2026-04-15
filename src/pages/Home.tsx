import { Building2 } from "lucide-react";
import monthly from "@/data/monthly.json";
import type { Mes } from "@/types";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { ContribChart } from "@/components/ContribChart";
import { SaldoAcumuladoChart } from "@/components/SaldoAcumuladoChart";
import { CategoriaDonut } from "@/components/CategoriaDonut";
import { YoyTable } from "@/components/YoyTable";
import { RetencaoCard } from "@/components/RetencaoCard";
import { YearAccordion } from "@/components/YearAccordion";
import { formatBRL } from "@/lib/currency";
import {
  contribuintesAtivosPorMes,
  composicaoEntradas,
  composicaoSaidas,
  ytdComparavel,
} from "@/lib/metrics";

const meses = monthly as Mes[];

function yoyDelta(a: number, b: number): string {
  if (a === 0) return "—";
  return `${b >= a ? "+" : ""}${(((b - a) / a) * 100).toFixed(1)}%`;
}

export default function Home() {
  const atual = meses[meses.length - 1];
  const currentYear = Number(atual.ref.slice(0, 4));
  const prevYear = currentYear - 1;
  const { yearA, yearB } = ytdComparavel(meses, prevYear, currentYear);
  const sumEntradas = (ms: Mes[]) => ms.reduce((a, m) => a + m.entradas.totais.geral, 0);
  const sumSaidas = (ms: Mes[]) => ms.reduce((a, m) => a + m.saidas.total, 0);
  const ativos = contribuintesAtivosPorMes(meses);
  const ativosAtual = ativos[ativos.length - 1];
  const ativosAnt = ativos[ativos.length - 2];

  const entAnoAnt = sumEntradas(yearA);
  const entAnoAtual = sumEntradas(yearB);
  const saiAnoAnt = sumSaidas(yearA);
  const saiAnoAtual = sumSaidas(yearB);
  const sustentoYTD = yearB.reduce((a, m) => a + m.saidas.sustentoMinisterial, 0);
  const pctSustento = entAnoAtual > 0 ? ((sustentoYTD / entAnoAtual) * 100).toFixed(0) : "—";

  const byYear: Record<number, Mes[]> = {};
  for (const m of meses) {
    const y = Number(m.ref.slice(0, 4));
    (byYear[y] ||= []).push(m);
  }
  const years = Object.keys(byYear).map(Number).sort().reverse();

  return (
    <div className="container py-10">
      <header className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Tesouraria PIB Confins</h1>
            <p className="text-sm text-muted-foreground">
              Relatórios financeiros mensais · {meses[0].nome} a {atual.nome}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Saldo atual" value={formatBRL(atual.resumo.novoSaldo)} sub={`fim de ${atual.nome}`} />
        <KpiTile
          label={`Contribuintes ${atual.nome.split("/")[0]}`}
          value={String(ativosAtual.total)}
          sub={ativosAnt ? `${ativosAtual.total - ativosAnt.total >= 0 ? "+" : ""}${ativosAtual.total - ativosAnt.total} vs mês ant.` : ""}
        />
        <KpiTile
          label={`Entradas YTD ${currentYear}`}
          value={formatBRL(entAnoAtual)}
          sub={`${yoyDelta(entAnoAnt, entAnoAtual)} vs ${prevYear}`}
          tone="positive"
        />
        <KpiTile
          label={`Saídas YTD ${currentYear}`}
          value={formatBRL(saiAnoAtual)}
          sub={`${yoyDelta(saiAnoAnt, saiAnoAtual)} vs ${prevYear}`}
          tone="negative"
        />
        <KpiTile label="Sustento min. / entradas" value={`${pctSustento}%`} sub={`${formatBRL(sustentoYTD)} YTD`} />
        <KpiTile
          label={`Saldo ${prevYear} → ${currentYear}`}
          value={formatBRL(atual.resumo.novoSaldo - (meses.find((m) => m.ref === `${prevYear}-01`)?.saldoAnterior ?? 0))}
          sub="variação total de caixa"
        />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Entradas vs saídas por mês</h2>
          <span className="text-xs text-muted-foreground">valores em R$</span>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <TrendChart meses={meses} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Contribuintes ativos por mês</h2>
          <ContribChart meses={meses} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-lg font-semibold">Saldo acumulado</h2>
          <SaldoAcumuladoChart meses={meses} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <YoyTable meses={meses} yearA={prevYear} yearB={currentYear} />
        <RetencaoCard meses={meses} yearA={prevYear} yearB={currentYear} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <CategoriaDonut data={composicaoEntradas(meses, currentYear)} title={`Composição de entradas — ${currentYear} YTD`} />
        <CategoriaDonut data={composicaoSaidas(meses, currentYear)} title={`Composição de saídas — ${currentYear} YTD`} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Relatórios por mês</h2>
        {years.map((y) => (
          <YearAccordion key={y} year={y} meses={byYear[y]} defaultOpen={y === currentYear} />
        ))}
      </section>

      <footer className="mt-12 border-t pt-6 text-xs text-muted-foreground">
        <p>
          Dados extraídos dos Relatórios Financeiros assinados na reunião mensal de contagem.
          Primeira Igreja Batista de Confins · CNPJ 16.534.166/0001-28
        </p>
      </footer>
    </div>
  );
}
