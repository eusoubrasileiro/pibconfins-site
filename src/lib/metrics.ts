import type { Mes } from "@/types";

export type AtivosMes = { ref: string; membros: number; naoMembros: number; total: number };
export type CategoriaValor = { categoria: string; valor: number };
export type Retencao = { retidos: number; novos: number; sairam: number; totalAnoAnterior: number };

const isAtivo = (valor: number | null): boolean => valor != null && valor > 0;

export function contribuintesAtivosPorMes(meses: Mes[]): AtivosMes[] {
  return meses.map((m) => {
    const membros = m.entradas.membros.filter((c) => isAtivo(c.valor)).length;
    const naoMembros = m.entradas.naoMembros.filter((c) => isAtivo(c.valor)).length;
    return { ref: m.ref, membros, naoMembros, total: membros + naoMembros };
  });
}

export function ytdComparavel(meses: Mes[], yearA: number, yearB: number): { yearA: Mes[]; yearB: Mes[] } {
  const a = meses.filter((m) => m.ref.startsWith(String(yearA)));
  const b = meses.filter((m) => m.ref.startsWith(String(yearB)));
  const common = Math.min(a.length, b.length);
  const monthsOfB = new Set(b.slice(0, common).map((m) => m.ref.slice(5)));
  return {
    yearA: a.filter((m) => monthsOfB.has(m.ref.slice(5))),
    yearB: b.slice(0, common),
  };
}

export function composicaoEntradas(meses: Mes[], year: number): CategoriaValor[] {
  const filt = meses.filter((m) => m.ref.startsWith(String(year)));
  const sum = (fn: (m: Mes) => number) => filt.reduce((a, m) => a + fn(m), 0);
  const sumOferta = (k: keyof Mes["entradas"]["ofertas"]) =>
    filt.reduce((a, m) => a + (m.entradas.ofertas[k] ?? 0), 0);
  return [
    { categoria: "Dízimos", valor: sum((m) => m.entradas.totais.membros) },
    { categoria: "Não-Membros", valor: sum((m) => m.entradas.totais.naoMembros) },
    { categoria: "Anônimas", valor: sumOferta("anonimas") },
    { categoria: "Missões", valor: sumOferta("missoes") },
    { categoria: "Recanto Vida", valor: sumOferta("recantoVida") },
    { categoria: "Beneficência", valor: sumOferta("beneficencia") },
    { categoria: "Outros", valor: sumOferta("outros") },
  ];
}

export function composicaoSaidas(meses: Mes[], year: number): CategoriaValor[] {
  const filt = meses.filter((m) => m.ref.startsWith(String(year)));
  const sum = (fn: (m: Mes) => number | null | undefined) =>
    filt.reduce((a, m) => a + (fn(m) ?? 0), 0);
  const sumOutros = filt.reduce((a, m) => a + m.saidas.outros.reduce((x, o) => x + o.valor, 0), 0);
  return [
    { categoria: "Sustento Ministerial", valor: sum((m) => m.saidas.sustentoMinisterial) },
    { categoria: "Zeladoria", valor: sum((m) => m.saidas.zeladoria) },
    { categoria: "Plano Cooperativo", valor: sum((m) => m.saidas.planoCooperativo) },
    { categoria: "COPASA", valor: sum((m) => m.saidas.copasa) },
    { categoria: "CEMIG", valor: sum((m) => m.saidas.cemig) },
    { categoria: "Manutenção", valor: sum((m) => m.saidas.manutencao) },
    { categoria: "Missões", valor: sum((m) => m.saidas.missoes) },
    { categoria: "Despesas Eventuais", valor: sum((m) => m.saidas.despesasEventuais) },
    { categoria: "Outros", valor: sumOutros },
  ];
}

const COMPROMISSOS_FIXOS = new Set(["Sustento Ministerial", "Plano Cooperativo", "Zeladoria"]);

export function composicaoSaidasAgrupada(meses: Mes[], year: number): CategoriaValor[] {
  const raw = composicaoSaidas(meses, year);
  const fixedTotal = raw.filter((r) => COMPROMISSOS_FIXOS.has(r.categoria)).reduce((s, r) => s + r.valor, 0);
  return [
    { categoria: "Compromissos fixos", valor: fixedTotal },
    ...raw.filter((r) => !COMPROMISSOS_FIXOS.has(r.categoria)),
  ];
}

function contribuintesUnicos(meses: Mes[]): Set<string> {
  const set = new Set<string>();
  for (const m of meses) {
    for (const c of m.entradas.membros) if (isAtivo(c.valor)) set.add(`m:${c.nome}`);
    for (const c of m.entradas.naoMembros) if (isAtivo(c.valor)) set.add(`n:${c.nome}`);
  }
  return set;
}

export function retencao(meses: Mes[], yearA: number, yearB: number): Retencao {
  const setA = contribuintesUnicos(meses.filter((m) => m.ref.startsWith(String(yearA))));
  const setB = contribuintesUnicos(meses.filter((m) => m.ref.startsWith(String(yearB))));
  let retidos = 0;
  for (const k of setA) if (setB.has(k)) retidos++;
  const novos = [...setB].filter((k) => !setA.has(k)).length;
  const sairam = setA.size - retidos;
  return { retidos, novos, sairam, totalAnoAnterior: setA.size };
}
