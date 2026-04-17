import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import monthly from "@/data/monthly.json";
import type { Mes } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { ContributorsTable } from "@/components/ContributorsTable";
import { formatBRL } from "@/lib/currency";
import { saidaAnnotations, type SaidaAnnotation } from "@/data/annotations";

const meses = monthly as Mes[];

function SaidaLabel({ label, annotation }: { label: string; annotation?: SaidaAnnotation }) {
  if (!annotation) return <>{label}</>;
  return (
    <span className="inline-flex items-center gap-1.5" title={annotation.nota}>
      {label}
      <Badge variant="muted" className="gap-1 text-[10px]">
        <Info className="h-3 w-3" />
        {annotation.tag}
      </Badge>
    </span>
  );
}

function findMes(ref: string | undefined): Mes | undefined {
  if (!ref) return undefined;
  return meses.find((m) => m.ref === ref);
}

const OFERTAS_LABELS: [keyof Mes["entradas"]["ofertas"], string][] = [
  ["anonimas", "Anônimas"],
  ["missoes", "Missões"],
  ["recantoVida", "Recanto Vida"],
  ["beneficencia", "Beneficência"],
  ["outros", "Outros (ofertas diversas)"],
];

export default function MonthDetail() {
  const { ref } = useParams();
  const mes = findMes(ref);

  if (!mes) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-xl font-semibold">Relatório não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">O mês solicitado ainda não foi publicado.</p>
        <Button asChild className="mt-6">
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  const ok = mes.validacao.status === "ok";
  const saldoNegativo = mes.resumo.saldoMes < 0;
  const annos = saidaAnnotations[mes.ref] ?? {};

  return (
    <div className="container py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relatório Financeiro</div>
          <h1 className="mt-1 text-3xl font-semibold">{mes.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Congregação em Confins</p>
        </div>
        {ok ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" /> totais conferem com o relatório assinado
          </Badge>
        ) : (
          <Badge variant="warning">
            <AlertTriangle className="h-3 w-3" /> com ressalva — ver notas
          </Badge>
        )}
      </header>

      {!ok && mes.validacao.flags.length > 0 && (
        <div className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="mb-1 font-medium text-warning-foreground">Ressalvas de validação</div>
          <ul className="list-disc pl-5 text-muted-foreground">
            {mes.validacao.flags.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.campo}</span>: {f.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-8 space-y-6">
        <ContributorsTable
          title="Entradas — Membros"
          contribuintes={mes.entradas.membros}
          total={mes.entradas.totais.membros}
        />
        <ContributorsTable
          title="Entradas — Não Membros"
          contribuintes={mes.entradas.naoMembros}
          total={mes.entradas.totais.naoMembros}
        />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ofertas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableBody>
                {OFERTAS_LABELS.map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(mes.entradas.ofertas[key])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total ofertas</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(mes.entradas.totais.ofertas)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrada Geral</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Saldo recorrente do mês anterior</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.saldoAnterior)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total de entradas deste mês</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(mes.entradas.totais.geral)}
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Somatório geral</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(mes.saldoAnterior + mes.entradas.totais.geral)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saídas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableBody>
                {([
                  ["planoCooperativo", "Plano Cooperativo", mes.saidas.planoCooperativo],
                  ["zeladoria", "Zeladoria (1/3 do salário vigente)", mes.saidas.zeladoria],
                  ["sustentoMinisterial", "Sustento Ministerial", mes.saidas.sustentoMinisterial],
                  ["missoes", "Missões", mes.saidas.missoes],
                  ["copasa", "COPASA", mes.saidas.copasa],
                  ["cemig", "CEMIG", mes.saidas.cemig],
                  ["manutencao", "Manutenção e Limpeza", mes.saidas.manutencao],
                  ["despesasEventuais", "Despesas Eventuais", mes.saidas.despesasEventuais],
                ] as const).map(([slot, label, valor]) => (
                  <TableRow key={slot}>
                    <TableCell>
                      <SaidaLabel label={label} annotation={annos[slot]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(valor)}</TableCell>
                  </TableRow>
                ))}
                {mes.saidas.outros.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">
                      <SaidaLabel label={`Outros — ${o.descricao}`} annotation={annos[o.descricao]} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(o.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total saídas</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.saidas.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo de Caixa</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Total de entrada do mês</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.entradas.totais.geral)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total de saídas do mês</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.saidas.total)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Saldo do mês</TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${saldoNegativo ? "text-destructive" : "text-success"}`}
                  >
                    {formatBRL(mes.resumo.saldoMes)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Saldo recorrente do mês anterior</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.saldoAnterior)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Novo saldo para o próximo mês</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBRL(mes.resumo.novoSaldo)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
