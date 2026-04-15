export type Contribuinte = { nome: string; valor: number | null };

export type Ofertas = {
  anonimas: number | null;
  missoes: number | null;
  recantoVida: number | null;
  beneficencia: number | null;
  outros: number | null;
};

export type Saidas = {
  planoCooperativo: number;
  zeladoria: number;
  sustentoMinisterial: number;
  missoes: number | null;
  copasa: number;
  cemig: number | null;
  manutencao: number | null;
  despesasEventuais: number | null;
  outros: { descricao: string; valor: number }[];
  total: number;
};

export type Mes = {
  ref: string;                // "2026-01"
  nome: string;               // "Janeiro/2026"
  saldoAnterior: number;
  entradas: {
    membros: Contribuinte[];
    naoMembros: Contribuinte[];
    ofertas: Ofertas;
    totais: { membros: number; naoMembros: number; ofertas: number; geral: number };
  };
  saidas: Saidas;
  resumo: { saldoMes: number; novoSaldo: number };
  validacao: {
    status: "ok" | "flagged";
    flags: { campo: string; motivo: string }[];
  };
};
