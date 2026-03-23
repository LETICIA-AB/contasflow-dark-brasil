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

// Account mappings are now in src/data/chartOfAccounts.ts
// Re-export for backward compatibility
export { CATEGORY_DEBIT_MAP as DEBIT_ACCOUNTS, CATEGORY_CREDIT_MAP as CREDIT_ACCOUNTS, BANK_ACCOUNT_MAP, resolveAccounts } from "./chartOfAccounts";

// === Storage keys ===
const KEYS = {
  clients: "cf-v3-clients",
  users: "cf-v3-users",
  uploads: "cf-v3-uploads",
};

// === Seed data ===
import { classifyTransaction } from "./classificationRules";

function generateTransactions(clientId: string): Transaction[] {
  const baseData: Record<string, [string, number, string][]> = {
    c1: [
      ["PIX REC BOOKING.COM RESERVA", 4500, "credit"],
      ["PIX REC DECOLAR HOSPEDAGEM", 3200, "credit"],
      ["TED REC AGENCIA VIAGEM", 2800, "credit"],
      ["PGTO FOLHA MAR/2026", -12500, "debit"],
      ["DAS SIMPLES NACIONAL", -3200, "debit"],
      ["PGTO FORNEC ALIMENTOS", -4800, "debit"],
      ["ALUGUEL IMOVEL COMERCIAL", -8500, "debit"],
      ["PGTO CONTA LUZ ENEL", -1200, "debit"],
      ["TARIFA BANCARIA MENSAL", -89.90, "debit"],
      ["PIX REC HOSPEDE DIRETO", 1500, "credit"],
      ["TRANSF TED RECEBIDA", 2200, "credit"],
      ["PGTO MANUTENCAO PISCINA", -950, "debit"],
      ["DEB AUT SEGURO INCENDIO", -450, "debit"],
      ["COMPRA CARTAO MATERIAL", -320, "debit"],
    ],
    c2: [
      ["PIX REC IFOOD REPASSE", 8500, "credit"],
      ["PIX REC RAPPI REPASSE", 3200, "credit"],
      ["VENDA CARTAO CREDITO", 12000, "credit"],
      ["VENDA CARTAO DEBITO", 6500, "credit"],
      ["PGTO FOLHA MAR/2026", -18000, "debit"],
      ["PGTO FORNEC HORTIFRUTI", -5600, "debit"],
      ["PGTO FORNEC CARNES", -8200, "debit"],
      ["ALUGUEL PONTO COMERCIAL", -6000, "debit"],
      ["PGTO GAS INDUSTRIAL", -1800, "debit"],
      ["ISS RETIDO FONTE", -960, "debit"],
      ["TARIFA BANCARIA", -59.90, "debit"],
      ["PARCELA EMPREST CAPITAL", -2500, "debit"],
    ],
    c3: [
      ["PIX REC VENDA PECAS", 15000, "credit"],
      ["BOLETO REC CLIENTE PJ", 8500, "credit"],
      ["TED REC VENDA ATACADO", 22000, "credit"],
      ["PGTO FOLHA MAR/2026", -25000, "debit"],
      ["PGTO FORNEC AUTOPECAS", -35000, "debit"],
      ["ICMS APURADO", -4800, "debit"],
      ["PIS/COFINS", -2100, "debit"],
      ["ALUGUEL GALPAO", -12000, "debit"],
      ["FRETE TRANSPORTADORA", -3500, "debit"],
      ["TARIFA BANCARIA", -129.90, "debit"],
      ["PRO-LABORE SOCIOS", -15000, "debit"],
      ["PARCELA FINANCIAMENTO", -4500, "debit"],
    ],
  };

  const data = baseData[clientId];
  if (!data) return [];

  const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];

  return data.map((item, i) => {
    const [desc, amt, type] = item;
    const txType = type as "credit" | "debit";
    const monthIdx = i % months.length;
    const day = String(5 + (i * 3) % 25).padStart(2, "0");

    const result = classifyTransaction(desc, txType);

    return {
      id: `${clientId}-t${i + 1}`,
      date: `${months[monthIdx]}-${day}`,
      description: desc,
      amount: Math.abs(amt),
      type: txType,
      category: result.auto ? result.category : "",
      classifiedBy: result.auto ? "auto" as const : "pending" as const,
      ruleId: result.auto ? result.ruleId : undefined,
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
