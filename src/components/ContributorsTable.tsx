import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/currency";
import type { Contribuinte } from "@/types";

type Props = {
  title: string;
  contribuintes: Contribuinte[];
  total: number;
};

export function ContributorsTable({ title, contribuintes, total }: Props) {
  const [query, setQuery] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const visiveis = useMemo(() => {
    const comValor = contribuintes.filter((c) => c.valor != null);
    const fonte = mostrarTodos ? contribuintes : comValor;
    if (!query.trim()) return fonte;
    const q = query.trim().toLowerCase();
    return fonte.filter((c) => c.nome.toLowerCase().includes(q));
  }, [contribuintes, query, mostrarTodos]);

  const comContribuicao = contribuintes.filter((c) => c.valor != null).length;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {comContribuicao} contribuição{comContribuicao === 1 ? "" : "ões"} · lista com {contribuintes.length} nomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setMostrarTodos((v) => !v)}>
            {mostrarTodos ? "Só com contribuição" : "Mostrar todos"}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-40 text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((c, i) => (
            <TableRow key={`${c.nome}-${i}`}>
              <TableCell className="text-right text-xs text-muted-foreground">{i + 1}</TableCell>
              <TableCell className={c.valor == null ? "text-muted-foreground" : ""}>{c.nome}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(c.valor)}</TableCell>
            </TableRow>
          ))}
          {visiveis.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                Nenhum nome encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="text-right">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatBRL(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
