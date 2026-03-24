export interface Account {
  code: string;
  seq: number;
  name: string;
  type: "A" | "R" | "D"; // Ativo, Receita, Despesa
  group: string;
}

export const CHART_OF_ACCOUNTS: Account[] = [
  // Caixa e Bancos (110xxx)
  { code: "110001", seq: 1, name: "Caixa Geral", type: "A", group: "Caixa e Bancos" },
  { code: "111001", seq: 2, name: "Caixa Econômica Federal", type: "A", group: "Caixa e Bancos" },
  { code: "111002", seq: 3, name: "Bradesco", type: "A", group: "Caixa e Bancos" },
  { code: "111003", seq: 4, name: "Itaú Unibanco", type: "A", group: "Caixa e Bancos" },
  { code: "111004", seq: 5, name: "Santander", type: "A", group: "Caixa e Bancos" },
  { code: "111005", seq: 6, name: "Banco do Brasil", type: "A", group: "Caixa e Bancos" },
  { code: "111006", seq: 7, name: "Sicoob", type: "A", group: "Caixa e Bancos" },
  { code: "111007", seq: 8, name: "Sicredi", type: "A", group: "Caixa e Bancos" },
  { code: "111008", seq: 9, name: "Banco Inter", type: "A", group: "Caixa e Bancos" },
  { code: "111009", seq: 10, name: "Nubank PJ", type: "A", group: "Caixa e Bancos" },

  // Aplicações Financeiras (112xxx)
  { code: "112001", seq: 11, name: "Aplicações de Liquidez Imediata", type: "A", group: "Aplicações Financeiras" },
  { code: "112002", seq: 12, name: "CDB / RDB", type: "A", group: "Aplicações Financeiras" },
  { code: "112003", seq: 13, name: "Fundos de Investimento", type: "A", group: "Aplicações Financeiras" },

  // Recebíveis (113xxx)
  { code: "113001", seq: 14, name: "Clientes a Receber", type: "A", group: "Recebíveis" },
  { code: "113002", seq: 15, name: "Adiantamentos a Fornecedores", type: "A", group: "Recebíveis" },

  // Estoques (114xxx)
  { code: "114001", seq: 16, name: "Estoque de Mercadorias", type: "A", group: "Estoques" },
  { code: "114002", seq: 17, name: "Estoque de Material de Consumo", type: "A", group: "Estoques" },

  // Impostos a Recuperar (115xxx)
  { code: "115001", seq: 18, name: "ICMS a Recuperar", type: "A", group: "Impostos a Recuperar" },

  // Receitas (410–411)
  { code: "410001", seq: 19, name: "Receita Bruta de Vendas de Mercadorias", type: "R", group: "Receitas" },
  { code: "410002", seq: 20, name: "Receita Bruta de Prestação de Serviços", type: "R", group: "Receitas" },
  { code: "410003", seq: 21, name: "Receita de Comissões", type: "R", group: "Receitas" },
  { code: "410004", seq: 22, name: "Receita de Royalties", type: "R", group: "Receitas" },
  { code: "410005", seq: 23, name: "Receita de Locação", type: "R", group: "Receitas" },
  { code: "411001", seq: 24, name: "Juros Recebidos", type: "R", group: "Receitas" },
  { code: "411002", seq: 25, name: "Descontos Obtidos", type: "R", group: "Receitas" },
  { code: "411003", seq: 26, name: "Rendimentos de Aplicações", type: "R", group: "Receitas" },
  { code: "411004", seq: 27, name: "Variação Cambial Ativa", type: "R", group: "Receitas" },
  { code: "411005", seq: 28, name: "Outras Receitas Operacionais", type: "R", group: "Receitas" },
  { code: "411006", seq: 29, name: "Receitas Não Operacionais", type: "R", group: "Receitas" },

  // Pessoal / Folha (310xxx)
  { code: "310001", seq: 30, name: "Salários e Ordenados", type: "D", group: "Pessoal / Folha" },
  { code: "310002", seq: 31, name: "Adiantamento Salarial", type: "D", group: "Pessoal / Folha" },
  { code: "310003", seq: 32, name: "Férias", type: "D", group: "Pessoal / Folha" },
  { code: "310004", seq: 33, name: "13° Salário", type: "D", group: "Pessoal / Folha" },
  { code: "310005", seq: 34, name: "Rescisões Trabalhistas", type: "D", group: "Pessoal / Folha" },
  { code: "310006", seq: 35, name: "Vale Transporte", type: "D", group: "Pessoal / Folha" },
  { code: "310007", seq: 36, name: "Vale Refeição / Alimentação", type: "D", group: "Pessoal / Folha" },
  { code: "310008", seq: 37, name: "Plano de Saúde", type: "D", group: "Pessoal / Folha" },
  { code: "310009", seq: 38, name: "Plano Dental", type: "D", group: "Pessoal / Folha" },
  { code: "310010", seq: 39, name: "Seguro de Vida", type: "D", group: "Pessoal / Folha" },
  { code: "310011", seq: 40, name: "Uniformes e EPIs", type: "D", group: "Pessoal / Folha" },
  { code: "310012", seq: 41, name: "Treinamento e Capacitação", type: "D", group: "Pessoal / Folha" },

  // Impostos e Tributos (330xxx)
  { code: "330001", seq: 42, name: "DAS — Simples Nacional", type: "D", group: "Impostos e Tributos" },
  { code: "330002", seq: 43, name: "IRPJ", type: "D", group: "Impostos e Tributos" },
  { code: "330003", seq: 44, name: "CSLL", type: "D", group: "Impostos e Tributos" },
  { code: "330004", seq: 45, name: "PIS", type: "D", group: "Impostos e Tributos" },
  { code: "330005", seq: 46, name: "COFINS", type: "D", group: "Impostos e Tributos" },
  { code: "330006", seq: 47, name: "ISS", type: "D", group: "Impostos e Tributos" },
  { code: "330007", seq: 48, name: "ICMS", type: "D", group: "Impostos e Tributos" },
  { code: "330008", seq: 49, name: "ICMS ST", type: "D", group: "Impostos e Tributos" },
  { code: "330009", seq: 50, name: "INSS Patronal", type: "D", group: "Impostos e Tributos" },
  { code: "330010", seq: 51, name: "FGTS", type: "D", group: "Impostos e Tributos" },
  { code: "330011", seq: 52, name: "GNRE", type: "D", group: "Impostos e Tributos" },
  { code: "330012", seq: 53, name: "IPTU", type: "D", group: "Impostos e Tributos" },
  { code: "330013", seq: 54, name: "IPVA", type: "D", group: "Impostos e Tributos" },
  { code: "330014", seq: 55, name: "Taxa de Licenciamento", type: "D", group: "Impostos e Tributos" },
  { code: "330015", seq: 56, name: "Outros Tributos", type: "D", group: "Impostos e Tributos" },

  // CMV / Fornecedores (320xxx)
  { code: "320001", seq: 57, name: "Compras de Mercadorias", type: "D", group: "CMV / Fornecedores" },
  { code: "320002", seq: 58, name: "Fretes sobre Compras", type: "D", group: "CMV / Fornecedores" },
  { code: "320003", seq: 59, name: "Embalagens", type: "D", group: "CMV / Fornecedores" },
  { code: "320004", seq: 60, name: "Matéria-prima", type: "D", group: "CMV / Fornecedores" },
  { code: "320005", seq: 61, name: "Material de Consumo", type: "D", group: "CMV / Fornecedores" },

  // Estrutura (321xxx)
  { code: "321001", seq: 62, name: "Aluguel de Imóvel", type: "D", group: "Estrutura" },
  { code: "321002", seq: 63, name: "Condomínio", type: "D", group: "Estrutura" },
  { code: "321003", seq: 64, name: "Energia Elétrica", type: "D", group: "Estrutura" },
  { code: "321004", seq: 65, name: "Água e Esgoto", type: "D", group: "Estrutura" },
  { code: "321005", seq: 66, name: "Gás", type: "D", group: "Estrutura" },
  { code: "321006", seq: 67, name: "Telefone e Internet", type: "D", group: "Estrutura" },
  { code: "321007", seq: 68, name: "Seguro do Imóvel", type: "D", group: "Estrutura" },
  { code: "321008", seq: 69, name: "Manutenção e Conservação", type: "D", group: "Estrutura" },

  // Serviços Contratados (322xxx)
  { code: "322001", seq: 70, name: "Honorários Contábeis", type: "D", group: "Serviços Contratados" },
  { code: "322002", seq: 71, name: "Honorários Advocatícios", type: "D", group: "Serviços Contratados" },
  { code: "322003", seq: 72, name: "Consultorias", type: "D", group: "Serviços Contratados" },
  { code: "322004", seq: 73, name: "Marketing e Publicidade", type: "D", group: "Serviços Contratados" },
  { code: "322005", seq: 74, name: "Software e Licenças", type: "D", group: "Serviços Contratados" },
  { code: "322006", seq: 75, name: "Serviços de Limpeza", type: "D", group: "Serviços Contratados" },
  { code: "322007", seq: 76, name: "Outros Serviços de Terceiros", type: "D", group: "Serviços Contratados" },

  // Despesas Bancárias (340xxx)
  { code: "340001", seq: 77, name: "Tarifas Bancárias", type: "D", group: "Despesas Bancárias" },
  { code: "340002", seq: 78, name: "Juros de Cheque Especial", type: "D", group: "Despesas Bancárias" },
  { code: "340003", seq: 79, name: "IOF", type: "D", group: "Despesas Bancárias" },
  { code: "340004", seq: 80, name: "Taxa de TED / DOC", type: "D", group: "Despesas Bancárias" },
  { code: "340005", seq: 81, name: "Juros de Mora", type: "D", group: "Despesas Bancárias" },
  { code: "340006", seq: 82, name: "Multas Bancárias", type: "D", group: "Despesas Bancárias" },

  // Empréstimos (350xxx)
  { code: "350001", seq: 83, name: "Parcelas de Empréstimos", type: "D", group: "Empréstimos" },
  { code: "350002", seq: 84, name: "Juros de Empréstimos", type: "D", group: "Empréstimos" },
  { code: "350003", seq: 85, name: "Financiamentos", type: "D", group: "Empréstimos" },
  { code: "350004", seq: 86, name: "Leasing", type: "D", group: "Empréstimos" },
  { code: "350005", seq: 87, name: "Fatura Cartão PJ", type: "D", group: "Empréstimos" },

  // Retiradas dos Sócios (360xxx)
  { code: "360001", seq: 88, name: "Distribuição de Lucros", type: "D", group: "Retiradas dos Sócios" },
  { code: "360002", seq: 89, name: "Pró-labore", type: "D", group: "Retiradas dos Sócios" },
  { code: "360003", seq: 90, name: "Adiantamento a Sócios", type: "D", group: "Retiradas dos Sócios" },

  // Outras Despesas (390xxx)
  { code: "390001", seq: 91, name: "Despesas Diversas", type: "D", group: "Outras Despesas" },
  { code: "390002", seq: 92, name: "Brindes e Doações", type: "D", group: "Outras Despesas" },
  { code: "390003", seq: 93, name: "Viagens e Deslocamentos", type: "D", group: "Outras Despesas" },
  { code: "390004", seq: 94, name: "Material de Escritório", type: "D", group: "Outras Despesas" },
  { code: "390005", seq: 95, name: "Perdas e Baixas", type: "D", group: "Outras Despesas" },
];

// Bank name → account code
export const BANK_ACCOUNT_MAP: Record<string, string> = {
  "Caixa Econômica Federal": "111001",
  "Bradesco": "111002",
  "Itaú Unibanco": "111003",
  "Santander": "111004",
  "Banco do Brasil": "111005",
  "Sicoob": "111006",
  "Sicredi": "111007",
  "Banco Inter": "111008",
  "Nubank PJ": "111009",
};

// Category → debit account code
export const CATEGORY_DEBIT_MAP: Record<string, string> = {
  "Folha de Pagamento": "310001",
  "Impostos e Tributos": "330001",
  "Fornecedores / Compras": "320001",
  "Aluguel": "321001",
  "Serviços Contratados": "322001",
  "Despesas Bancárias": "340001",
  "Empréstimos e Financiamentos": "350001",
  "Retiradas dos Sócios": "360001",
  "Outros": "390001",
};

// Category → credit account code (revenues)
export const CATEGORY_CREDIT_MAP: Record<string, string> = {
  "Receita de Vendas": "410001",
  "Receita de Serviços": "410002",
};

export function resolveAccounts(
  category: string,
  txType: "credit" | "debit",
  bankName: string,
  chartOverrides?: Record<string, { debit: string; credit: string }>
): { debit: string; credit: string } {
  // Check overrides first
  if (chartOverrides && chartOverrides[category]) {
    return chartOverrides[category];
  }

  const bankAccount = BANK_ACCOUNT_MAP[bankName] || "111001";

  if (txType === "debit") {
    return {
      debit: CATEGORY_DEBIT_MAP[category] || "390001",
      credit: bankAccount,
    };
  } else {
    return {
      debit: bankAccount,
      credit: CATEGORY_CREDIT_MAP[category] || "410001",
    };
  }
}
