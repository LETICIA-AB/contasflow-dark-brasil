// === Types ===
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  classifiedBy: "auto" | "client" | "accountant" | "pending";
  ruleId?: string;
  approved: boolean;
}

export interface Client {
  id: string;
  name: string;
  cnpj: string;
  regime: string;
  bank: string;
  status: "classify" | "review" | "approved";
  transactions: Transaction[];
}

export interface User {
  id: string;
  cnpj: string;
  password: string;
  clientId: string;
  active: boolean;
  lastLogin: string | null;
}

export interface Upload {
  id: string;
  clientId: string;
  filename: string;
  bank: string;
  size: string;
  date: string;
  period: string;
  status: "processado" | "aguardando" | "erro";
}

export type Session =
  | { type: "client"; clientId: string; cnpj: string }
  | { type: "accountant" }
  | null;

// === Categories ===
export const CATEGORIES = [
  "Receita de Vendas",
  "Receita de Serviços",
  "Folha de Pagamento",
  "Impostos e Tributos",
  "Fornecedores / Compras",
  "Aluguel",
  "Serviços Contratados",
  "Despesas Bancárias",
  "Empréstimos e Financiamentos",
  "Retiradas dos Sócios",
  "Outros",
];

// === Domínio account mapping ===
export const DEBIT_ACCOUNTS: Record<string, string> = {
  "Folha de Pagamento": "310001",
  "Impostos e Tributos": "330001",
  "Fornecedores / Compras": "320001",
  "Aluguel": "320002",
  "Serviços Contratados": "320003",
  "Despesas Bancárias": "340001",
  "Empréstimos e Financiamentos": "350001",
  "Retiradas dos Sócios": "360001",
  "Outros": "390001",
};

export const CREDIT_ACCOUNTS: Record<string, string> = {
  "Receita de Vendas": "410001",
  "Receita de Serviços": "410002",
};

export const BANK_ACCOUNT = "111020";

// === Storage keys ===
const KEYS = {
  clients: "cf-v3-clients",
  users: "cf-v3-users",
  uploads: "cf-v3-uploads",
};

// === Seed data ===
function generateTransactions(clientId: string): Transaction[] {
  const baseData: Record<string, { descriptions: [string, number, string, string][] }> = {
    c1: {
      descriptions: [
        ["PIX REC BOOKING.COM RESERVA", 4500, "credit", "Receita de Serviços"],
        ["PIX REC DECOLAR HOSPEDAGEM", 3200, "credit", "Receita de Serviços"],
        ["TED REC AGENCIA VIAGEM", 2800, "credit", "Receita de Vendas"],
        ["PGTO FOLHA MAR/2026", -12500, "debit", "Folha de Pagamento"],
        ["DAS SIMPLES NACIONAL", -3200, "debit", "Impostos e Tributos"],
        ["PGTO FORNEC ALIMENTOS", -4800, "debit", "Fornecedores / Compras"],
        ["ALUGUEL IMOVEL COMERCIAL", -8500, "debit", "Aluguel"],
        ["PGTO CONTA LUZ ENEL", -1200, "debit", "Serviços Contratados"],
        ["TARIFA BANCARIA MENSAL", -89.90, "debit", "Despesas Bancárias"],
        ["PIX REC HOSPEDE DIRETO", 1500, "credit", "pending"],
        ["TRANSF TED RECEBIDA", 2200, "credit", "pending"],
        ["PGTO MANUTENCAO PISCINA", -950, "debit", "pending"],
        ["DEB AUT SEGURO INCENDIO", -450, "debit", "pending"],
        ["COMPRA CARTAO MATERIAL", -320, "debit", "pending"],
      ],
    },
    c2: {
      descriptions: [
        ["PIX REC IFOOD REPASSE", 8500, "credit", "Receita de Vendas"],
        ["PIX REC RAPPI REPASSE", 3200, "credit", "Receita de Vendas"],
        ["VENDA CARTAO CREDITO", 12000, "credit", "Receita de Vendas"],
        ["VENDA CARTAO DEBITO", 6500, "credit", "Receita de Vendas"],
        ["PGTO FOLHA MAR/2026", -18000, "debit", "Folha de Pagamento"],
        ["PGTO FORNEC HORTIFRUTI", -5600, "debit", "Fornecedores / Compras"],
        ["PGTO FORNEC CARNES", -8200, "debit", "Fornecedores / Compras"],
        ["ALUGUEL PONTO COMERCIAL", -6000, "debit", "Aluguel"],
        ["PGTO GAS INDUSTRIAL", -1800, "debit", "Serviços Contratados"],
        ["ISS RETIDO FONTE", -960, "debit", "Impostos e Tributos"],
        ["TARIFA BANCARIA", -59.90, "debit", "Despesas Bancárias"],
        ["PARCELA EMPREST CAPITAL", -2500, "debit", "Empréstimos e Financiamentos"],
      ],
    },
    c3: {
      descriptions: [
        ["PIX REC VENDA PECAS", 15000, "credit", "Receita de Vendas"],
        ["BOLETO REC CLIENTE PJ", 8500, "credit", "Receita de Vendas"],
        ["TED REC VENDA ATACADO", 22000, "credit", "Receita de Vendas"],
        ["PGTO FOLHA MAR/2026", -25000, "debit", "Folha de Pagamento"],
        ["PGTO FORNEC AUTOPECAS", -35000, "debit", "Fornecedores / Compras"],
        ["ICMS APURADO", -4800, "debit", "Impostos e Tributos"],
        ["PIS/COFINS", -2100, "debit", "Impostos e Tributos"],
        ["ALUGUEL GALPAO", -12000, "debit", "Aluguel"],
        ["FRETE TRANSPORTADORA", -3500, "debit", "Serviços Contratados"],
        ["TARIFA BANCARIA", -129.90, "debit", "Despesas Bancárias"],
        ["PRO-LABORE SOCIOS", -15000, "debit", "Retiradas dos Sócios"],
        ["PARCELA FINANCIAMENTO", -4500, "debit", "Empréstimos e Financiamentos"],
      ],
    },
  };

  const data = baseData[clientId];
  if (!data) return [];

  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];

  return data.descriptions.map((item, i) => {
    const [desc, amt, type, cat] = item;
    const monthIdx = i % months.length;
    const day = String(5 + (i * 3) % 25).padStart(2, "0");
    return {
      id: `${clientId}-t${i + 1}`,
      date: `${months[monthIdx]}-${day}`,
      description: desc as string,
      amount: Math.abs(amt as number),
      type: type as "credit" | "debit",
      category: cat === "pending" ? "" : (cat as string),
      classifiedBy: cat === "pending" ? "pending" : "auto",
      approved: clientId === "c3",
    };
  });
}

function seedClients(): Client[] {
  return [
    {
      id: "c1",
      name: "Santos e Silva Hotéis",
      cnpj: "12.345.678/0001-90",
      regime: "Lucro Presumido",
      bank: "Caixa Econômica Federal",
      status: "classify",
      transactions: generateTransactions("c1"),
    },
    {
      id: "c2",
      name: "Restaurante Bom Sabor Ltda",
      cnpj: "23.456.789/0001-01",
      regime: "Simples Nacional",
      bank: "Bradesco",
      status: "review",
      transactions: generateTransactions("c2"),
    },
    {
      id: "c3",
      name: "Auto Peças Nordeste Ltda",
      cnpj: "34.567.890/0001-12",
      regime: "Lucro Real",
      bank: "Itaú Unibanco",
      status: "approved",
      transactions: generateTransactions("c3"),
    },
  ];
}

function seedUsers(): User[] {
  return [
    { id: "u1", cnpj: "12.345.678/0001-90", password: "hotel123", clientId: "c1", active: true, lastLogin: null },
    { id: "u2", cnpj: "23.456.789/0001-01", password: "sabor123", clientId: "c2", active: true, lastLogin: null },
    { id: "u3", cnpj: "34.567.890/0001-12", password: "autopecas", clientId: "c3", active: true, lastLogin: null },
  ];
}

function seedUploads(): Upload[] {
  return [
    { id: "up1", clientId: "c1", filename: "extrato_caixa_mar2026.ofx", bank: "Caixa", size: "245 KB", date: "2026-03-15 09:30", period: "Mar/2026", status: "processado" },
    { id: "up2", clientId: "c2", filename: "extrato_bradesco_mar2026.csv", bank: "Bradesco", size: "128 KB", date: "2026-03-14 14:15", period: "Mar/2026", status: "processado" },
    { id: "up3", clientId: "c3", filename: "extrato_itau_mar2026.ofx", bank: "Itaú", size: "312 KB", date: "2026-03-13 11:00", period: "Mar/2026", status: "processado" },
  ];
}

// === Store helpers ===
export function loadClients(): Client[] {
  const raw = localStorage.getItem(KEYS.clients);
  if (raw) return JSON.parse(raw);
  const data = seedClients();
  localStorage.setItem(KEYS.clients, JSON.stringify(data));
  return data;
}

export function saveClients(clients: Client[]) {
  localStorage.setItem(KEYS.clients, JSON.stringify(clients));
}

export function loadUsers(): User[] {
  const raw = localStorage.getItem(KEYS.users);
  if (raw) return JSON.parse(raw);
  const data = seedUsers();
  localStorage.setItem(KEYS.users, JSON.stringify(data));
  return data;
}

export function saveUsers(users: User[]) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function loadUploads(): Upload[] {
  const raw = localStorage.getItem(KEYS.uploads);
  if (raw) return JSON.parse(raw);
  const data = seedUploads();
  localStorage.setItem(KEYS.uploads, JSON.stringify(data));
  return data;
}

export function saveUploads(uploads: Upload[]) {
  localStorage.setItem(KEYS.uploads, JSON.stringify(uploads));
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
