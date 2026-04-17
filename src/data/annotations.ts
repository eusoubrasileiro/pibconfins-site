// Anotações contábeis cross-mês — contexto que existia no papel/planilha mas
// não cabe na tabela de saídas por si só. Rendered como tooltip no detalhe do mês.

export type SaidaAnnotation = { tag: string; nota: string };

// Key para scalars: o slot name no JSON ("sustentoMinisterial", "copasa", etc.).
// Key para outros: o `descricao` exato.
export const saidaAnnotations: Record<string, Record<string, SaidaAnnotation>> = {
  "2025-03": {
    sustentoMinisterial: {
      tag: "lançado em 05/2025",
      nota: "Sustento Ministerial de Março/2025 não foi contabilizado neste mês. O valor de R$ 5.700,00 foi lançado em Maio/2025 na linha 'Prebenda Março/2025 > Não havíamos contabilizado no mês'.",
    },
  },
  "2025-05": {
    "Prebenda Março/2025 > Não havíamos contabilizado no mês": {
      tag: "competência 03/2025",
      nota: "Sustento Ministerial referente a Março/2025 (onde constou R$ 0,00), lançado com atraso nesta competência de Maio/2025.",
    },
  },
  "2025-09": {
    sustentoMinisterial: {
      tag: "parcial",
      nota: "Sustento pago parcialmente em Setembro (R$ 4.267,04). O complemento de R$ 1.432,96 foi lançado em Novembro/2025 como 'Correção sustento ministerial referente a Setembro/25'.",
    },
  },
  "2025-10": {
    "Diferença conta COPASA Agosto": {
      tag: "ajuste contábil",
      nota: "Ajuste (a menor) da conta COPASA referente a Agosto/2025.",
    },
    "Outros - não sabemos": {
      tag: "sem descrição",
      nota: "Linha de saída sem descrição na planilha consolidada de 2025 do Pr. Luis. Identidade ainda não confirmada (aguardando resposta do pastor).",
    },
  },
  "2025-11": {
    "Correção sustento ministerial referente a Setembro/25": {
      tag: "competência 09/2025",
      nota: "Complemento do Sustento Ministerial de Setembro/2025, que havia sido pago parcialmente (R$ 4.267,04) na competência própria.",
    },
    "Cemig Setembro": {
      tag: "competência 09/2025",
      nota: "Fatura CEMIG de Setembro/2025, paga/contabilizada em Novembro.",
    },
    "Cemig Outubro": {
      tag: "competência 10/2025",
      nota: "Fatura CEMIG de Outubro/2025, paga/contabilizada em Novembro.",
    },
  },
};
