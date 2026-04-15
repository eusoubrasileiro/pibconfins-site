import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/currency";
import type { Mes } from "@/types";

export function MonthCard({ mes }: { mes: Mes }) {
  const saldoNegativo = mes.resumo.saldoMes < 0;
  const ok = mes.validacao.status === "ok";

  return (
    <Link to={`/mes/${mes.ref}`} className="group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relatório</div>
              <div className="mt-0.5 text-xl font-semibold">{mes.nome}</div>
            </div>
            {ok ? (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" /> validado
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3" /> ressalva
              </Badge>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Entradas</dt>
              <dd className="font-medium tabular-nums">{formatBRL(mes.entradas.totais.geral)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Saídas</dt>
              <dd className="font-medium tabular-nums">{formatBRL(mes.saidas.total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Saldo do mês</dt>
              <dd className={`font-medium tabular-nums ${saldoNegativo ? "text-destructive" : "text-success"}`}>
                {formatBRL(mes.resumo.saldoMes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Novo saldo</dt>
              <dd className="font-medium tabular-nums">{formatBRL(mes.resumo.novoSaldo)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center text-sm font-medium text-primary group-hover:underline">
            Ver relatório <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
