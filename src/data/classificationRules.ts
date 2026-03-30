export interface ClassificationRule {
  id: string;
  priority: number;
  type: "D" | "C" | "*";
  category: string;
  pattern: RegExp;
  examples: string[];
}

export const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Folha de Pagamento (R01–R06)
  { id: "R01", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /SALÁRIO|SALARIO|FOLHA/i, examples: ["SALÁRIOS MARÇO", "PGTO FOLHA MAR/2026"] },
  { id: "R02", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /ADIANTAMENTO\s*SAL/i, examples: ["ADIANTAMENTO SALARIAL"] },
  { id: "R03", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /FÉRIAS|FERIAS/i, examples: ["PGTO FÉRIAS FUNC"] },
  { id: "R04", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /VALE[\s-]?(TRANSPORTE|REFEIÇÃO|REFEICAO|ALIMENTAÇÃO|ALIMENTACAO)/i, examples: ["VALE TRANSPORTE", "VALE REFEIÇÃO"] },
  { id: "R05", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /PLANO[\s-]?(SAÚDE|SAUDE|DENTAL)/i, examples: ["PLANO SAÚDE UNIMED"] },
  { id: "R06", priority: 1, type: "D", category: "Folha de Pagamento", pattern: /RESCISÃO|RESCISAO|13[\s°]|DÉCIMO/i, examples: ["RESCISÃO CONTRATO", "13° SALÁRIO"] },

  // Impostos e Tributos (R10–R22)
  { id: "R10", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bDAS\b.*SIMPLES|SIMPLES\s*NACIONAL/i, examples: ["DAS SIMPLES NACIONAL MAR"] },
  { id: "R11", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /DARF/i, examples: ["DARF IRPJ", "DARF PIS"] },
  { id: "R12", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bIRPJ\b/i, examples: ["IRPJ TRIMESTRAL"] },
  { id: "R13", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bCSLL\b/i, examples: ["CSLL TRIMESTRAL"] },
  { id: "R14", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bPIS\b/i, examples: ["PIS APURAÇÃO"] },
  { id: "R15", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /COFINS/i, examples: ["COFINS MENSAL"] },
  { id: "R16", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bISS\b/i, examples: ["ISS RETIDO FONTE", "ISS MENSAL"] },
  { id: "R17", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bICMS\b/i, examples: ["ICMS APURADO", "ICMS ST"] },
  { id: "R18", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bINSS\b/i, examples: ["INSS PATRONAL", "INSS FUNCIONÁRIOS"] },
  { id: "R19", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bFGTS\b/i, examples: ["FGTS MENSAL"] },
  { id: "R20", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bGNRE\b/i, examples: ["GNRE ICMS"] },
  { id: "R21", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bIPTU\b/i, examples: ["IPTU 2026 PARCELA"] },
  { id: "R22", priority: 2, type: "D", category: "Impostos e Tributos", pattern: /\bIPVA\b/i, examples: ["IPVA VEÍCULO"] },

  // Receita de Vendas (R30–R33)
  { id: "R30", priority: 3, type: "C", category: "Receita de Vendas", pattern: /CIELO|REDE|GETNET|STONE|PAGSEGURO|MERCADO\s*PAGO/i, examples: ["CIELO VENDAS", "STONE REPASSE"] },
  { id: "R31", priority: 3, type: "C", category: "Receita de Vendas", pattern: /IFOOD|RAPPI|UBER\s*EATS/i, examples: ["PIX REC IFOOD REPASSE"] },
  { id: "R32", priority: 3, type: "C", category: "Receita de Vendas", pattern: /VENDA\s*(CARTAO|CARTÃO|DINHEIRO|DEBITO|DÉBITO|CREDITO|CRÉDITO)/i, examples: ["VENDA CARTAO CREDITO"] },
  { id: "R33", priority: 3, type: "C", category: "Receita de Vendas", pattern: /DEPOSITO\s*DINHEIRO|DEP\s*DINHEIRO/i, examples: ["DEPOSITO DINHEIRO LOJA"] },

  // Receita de Serviços (R35–R38)
  { id: "R35", priority: 3, type: "C", category: "Receita de Serviços", pattern: /CRED\s*PIX|PIX\s*REC/i, examples: ["CRED PIX CLIENTE", "PIX REC BOOKING.COM"] },
  { id: "R36", priority: 3, type: "C", category: "Receita de Serviços", pattern: /TED\s*REC|CRED\s*TED/i, examples: ["TED REC AGENCIA VIAGEM"] },
  { id: "R37", priority: 3, type: "C", category: "Receita de Serviços", pattern: /CRED\s*BOLETO|BOLETO\s*REC/i, examples: ["BOLETO REC CLIENTE PJ"] },
  { id: "R38", priority: 3, type: "C", category: "Receita de Serviços", pattern: /TRANSF.*RECEBID|RECEBIMENTO/i, examples: ["TRANSF TED RECEBIDA"] },

  // Fornecedores / Compras (R40–R43)
  { id: "R40", priority: 4, type: "D", category: "Fornecedores / Compras", pattern: /ENVIO\s*PIX.*FORN|PIX\s*ENV.*FORN/i, examples: ["ENVIO PIX FORNECEDOR"] },
  { id: "R41", priority: 4, type: "D", category: "Fornecedores / Compras", pattern: /PGTO\s*FORN|PAG.*FORN/i, examples: ["PGTO FORNEC HORTIFRUTI"] },
  { id: "R42", priority: 4, type: "D", category: "Fornecedores / Compras", pattern: /FRETE|TRANSPORTADORA/i, examples: ["FRETE TRANSPORTADORA"] },
  { id: "R43", priority: 4, type: "D", category: "Fornecedores / Compras", pattern: /COMPRA[S]?\s*(CARTAO|CARTÃO|MATERIAL|MERCADORIA)/i, examples: ["COMPRA CARTAO MATERIAL"] },

  // Aluguel (R50–R51)
  { id: "R50", priority: 5, type: "D", category: "Aluguel", pattern: /ALUGUEL/i, examples: ["ALUGUEL IMOVEL COMERCIAL"] },
  { id: "R51", priority: 5, type: "D", category: "Aluguel", pattern: /CONDOMÍNIO|CONDOMINIO/i, examples: ["CONDOMÍNIO EMPRESARIAL"] },

  // Serviços Contratados (R55–R59)
  { id: "R55", priority: 6, type: "D", category: "Serviços Contratados", pattern: /HONORÁRIOS|HONORARIOS|CONTABILIDADE/i, examples: ["HONORÁRIOS CONTÁBEIS"] },
  { id: "R56", priority: 6, type: "D", category: "Serviços Contratados", pattern: /MARKETING|PUBLICIDADE|PROPAGANDA/i, examples: ["MARKETING DIGITAL"] },
  { id: "R57", priority: 6, type: "D", category: "Serviços Contratados", pattern: /SOFTWARE|SISTEMA|LICENÇA|LICENCA|ASSINATURA/i, examples: ["SOFTWARE ERP MENSAL"] },
  { id: "R58", priority: 6, type: "D", category: "Serviços Contratados", pattern: /CONTA\s*(LUZ|ENERGIA|ÁGUA|AGUA|TELEFONE|INTERNET)/i, examples: ["PGTO CONTA LUZ ENEL"] },
  { id: "R59", priority: 6, type: "D", category: "Serviços Contratados", pattern: /MANUTENÇAO|MANUTENCAO|MANUTENÇÃO|LIMPEZA|CONSERVAÇÃO/i, examples: ["PGTO MANUTENCAO PISCINA"] },

  // Despesas Bancárias (R60–R63)
  { id: "R60", priority: 7, type: "D", category: "Despesas Bancárias", pattern: /TARIFA|TAR\s*BANCÁRIA|TAR\s*BANCARIA/i, examples: ["TARIFA BANCARIA MENSAL"] },
  { id: "R61", priority: 7, type: "D", category: "Despesas Bancárias", pattern: /JUROS\s*CHEQUE\s*ESP|CH\s*ESPECIAL/i, examples: ["JUROS CHEQUE ESPECIAL"] },
  { id: "R62", priority: 7, type: "D", category: "Despesas Bancárias", pattern: /\bIOF\b/i, examples: ["IOF OPERAÇÃO"] },
  { id: "R63", priority: 7, type: "D", category: "Despesas Bancárias", pattern: /TAXA\s*TED|TAXA\s*PIX|TAXA\s*DOC/i, examples: ["TAXA TED ENVIADA"] },

  // Empréstimos e Financiamentos (R70–R73)
  { id: "R70", priority: 8, type: "D", category: "Empréstimos e Financiamentos", pattern: /PARCELA\s*(EMPRÉSTIMO|EMPRESTIMO|EMPREST)/i, examples: ["PARCELA EMPREST CAPITAL"] },
  { id: "R71", priority: 8, type: "D", category: "Empréstimos e Financiamentos", pattern: /FINANCIAMENTO|PARCELA\s*FINANC/i, examples: ["PARCELA FINANCIAMENTO"] },
  { id: "R72", priority: 8, type: "D", category: "Empréstimos e Financiamentos", pattern: /LEASING/i, examples: ["LEASING VEÍCULO"] },
  { id: "R73", priority: 8, type: "D", category: "Empréstimos e Financiamentos", pattern: /FATURA\s*CARTÃO\s*PJ|FATURA\s*CARTAO\s*PJ/i, examples: ["FATURA CARTÃO PJ"] },

  // Retiradas dos Sócios (R80–R81)
  { id: "R80", priority: 9, type: "D", category: "Retiradas dos Sócios", pattern: /RETIRADA\s*SÓCIO|RETIRADA\s*SOCIO|PRO[\s-]?LABORE/i, examples: ["RETIRADA SÓCIO", "PRO-LABORE SOCIOS"] },
  { id: "R81", priority: 9, type: "D", category: "Retiradas dos Sócios", pattern: /DIVIDENDO|DISTRIBUIÇÃO\s*LUCRO|DISTRIBUICAO\s*LUCRO/i, examples: ["DIVIDENDOS TRIMESTRAIS"] },

  // Stone / Maquininha — specific patterns (R90–R99)
  { id: "R90", priority: 1, type: "D", category: "Despesas Bancárias", pattern: /^TARIFA$|^TARIFA\s*[-–]/i, examples: ["Tarifa", "Tarifa - Stone"] },
  { id: "R91", priority: 1, type: "C", category: "Receita de Vendas", pattern: /RECEBIMENTO\s*VENDAS.*ANTECIPA[CÇ]/i, examples: ["Recebimento vendas Antecipação"] },
  { id: "R92", priority: 1, type: "C", category: "Receita de Vendas", pattern: /RECEBIMENTO\s*VENDAS/i, examples: ["Recebimento vendas"] },
  { id: "R93", priority: 2, type: "C", category: "Receita de Vendas", pattern: /PIX\s*\|\s*MAQUININHA|MAQUININHA/i, examples: ["BRAZAUK LTD | Pix | Maquininha", "Pix | Maquininha"] },
  { id: "R94", priority: 2, type: "C", category: "Receita de Vendas", pattern: /DEP[OÓ]SITO\s*DE\s*VENDAS/i, examples: ["Depósito de vendas"] },
  { id: "R95", priority: 3, type: "D", category: "Despesas Bancárias", pattern: /TAXA\s*STONE|STONE\s*TAXA/i, examples: ["TAXA STONE MENSAL"] },
  { id: "R96", priority: 3, type: "C", category: "Receita de Serviços", pattern: /PIX\s*REC|CRED\s*PIX|PIX\s*RECEBIDO/i, examples: ["PIX REC CLIENTE", "CRED PIX"] },
  { id: "R97", priority: 3, type: "D", category: "Despesas Bancárias", pattern: /PIX\s*ENV|PIX\s*ENVIADO/i, examples: ["PIX ENVIADO FORNECEDOR"] },
];

export interface ClassificationResult {
  category: string;
  ruleId: string;
  auto: true;
}

export function classifyTransaction(
  desc: string,
  type: "credit" | "debit"
): ClassificationResult | { auto: false } {
  const typeCode = type === "debit" ? "D" : "C";
  const sorted = [...CLASSIFICATION_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (rule.type !== "*" && rule.type !== typeCode) continue;
    if (rule.pattern.test(desc)) {
      return { category: rule.category, ruleId: rule.id, auto: true };
    }
  }

  return { auto: false };
}

// Full classification with memory lookup + account resolution
import { findInMemory, saveToMemory } from "./memoryStore";
import { resolveAccounts } from "./chartOfAccounts";
import type { Client } from "./store";

export interface FullClassificationResult {
  category: string;
  classifiedBy: "memory" | "auto" | "pending";
  ruleId?: string;
  debitAccount: string;
  creditAccount: string;
}

export function classifyWithMemory(
  desc: string,
  type: "credit" | "debit",
  client: Client
): FullClassificationResult {
  // 1. Check memory
  const mem = findInMemory(desc, client.id);
  if (mem) {
    return {
      category: mem.category,
      classifiedBy: "memory",
      debitAccount: mem.debitAccount,
      creditAccount: mem.creditAccount,
    };
  }

  // 2. Check regex rules
  const result = classifyTransaction(desc, type);
  if (result.auto) {
    const accounts = resolveAccounts(result.category, type, client.bank, client.chartOverrides);
    return {
      category: result.category,
      classifiedBy: "auto",
      ruleId: result.ruleId,
      debitAccount: accounts.debit,
      creditAccount: accounts.credit,
    };
  }

  // 3. Pending
  return {
    category: "",
    classifiedBy: "pending",
    debitAccount: "",
    creditAccount: "",
  };
}

export function recordClassification(
  desc: string,
  category: string,
  type: "credit" | "debit",
  client: Client
) {
  const accounts = resolveAccounts(category, type, client.bank, client.chartOverrides);
  saveToMemory(desc, category, accounts.debit, accounts.credit, client.id);
}
