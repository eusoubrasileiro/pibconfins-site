import { Building2 } from "lucide-react";
import monthly from "@/data/monthly.json";
import type { Mes } from "@/types";
import { KpiTile } from "@/components/KpiTile";
import { TrendChart } from "@/components/TrendChart";
import { MonthCard } from "@/components/MonthCard";
import { formatBRL } from "@/lib/currency";

const meses = monthly as Mes[];

function contribuintesUnicos(meses: Mes[]): number {
  const set = new Set<string>();
  for (const m of meses) {
    for (const c of m.entradas.membros) if (c.valor != null) set.add(`m:${c.nome}`);
    for (const c of m.entradas.naoMembros) if (c.valor != null) set.add(`n:${c.nome}`);
  }
  return set.size;
}

export default function Home() {
  const atual = meses[meses.length - 1];
  const totalEntradas = meses.reduce((a, m) => a + m.entradas.totais.geral, 0);
  const totalSaidas = meses.reduce((a, m) => a + m.saidas.total, 0);
  const contribUnicos = contribuintesUnicos(meses);

  const primeiro = meses[0].nome;
  const ultimo = atual.nome;

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
              Relatórios financeiros mensais · {primeiro} a {ultimo}
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Saldo atual" value={formatBRL(atual.resumo.novoSaldo)} sub={`fim de ${atual.nome}`} />
        <KpiTile label="Entradas (3 meses)" value={formatBRL(totalEntradas)} sub="total acumulado" tone="positive" />
        <KpiTile label="Saídas (3 meses)" value={formatBRL(totalSaidas)} sub="total acumulado" tone="negative" />
        <KpiTile label="Contribuintes únicos" value={String(contribUnicos)} sub="membros + não membros" />
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

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Relatórios por mês</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meses.map((m) => (
            <MonthCard key={m.ref} mes={m} />
          ))}
        </div>
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
