// === Types ===
export type ValidationFlag = {
  type: "duplicate" | "unusual_amount" | "missing_category" | "low_confidence" | "manual_review" | "category_mismatch";
  severity: "info" | "warning" | "error";
  message: string;
};

export type AuditLayerStatus = "pass" | "skip" | "pending" | "override";

export interface AuditLayerData {
  layer: "input" | "automation" | "ai_suggestion" | "client_description";
  label: string;
  sublabel: string;
  status: AuditLayerStatus;
  details: Record<string, string | number | undefined>;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  classifiedBy: "auto" | "client" | "accountant" | "memory" | "pending";
  ruleId?: string;
  debitAccount?: string;
  creditAccount?: string;
  approved: boolean;
  // Validation layer
  validationFlags?: ValidationFlag[];
  confidenceScore?: number; // 0-100
  accountantNote?: string;
  validated?: boolean; // explicitly validated by accountant
  rejectedBy?: "accountant";
  clientDescription?: string; // descrição livre quando categoria é "Outros"
}

export interface Client {
  id: string;
  name: string;
  cnpj: string;
  regime: string;
  bank: string;
  banks: string[];
  chartOverrides: Record<string, { debit: string; credit: string }>;
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
  clients: "cf-v4-clients",   // v4: mock transactions removed, start clean
  users: "cf-v3-users",       // keep user credentials across resets
  uploads: "cf-v4-uploads",   // v4: fresh upload history
};

// === Seed data ===
import { classifyTransaction } from "./classificationRules";
import { resolveAccounts } from "./chartOfAccounts";

function generateTransactions(clientId: string): Transaction[] {
  const bankMap: Record<string, string> = { c1: "Caixa Econômica Federal", c2: "Bradesco", c3: "Itaú Unibanco" };
  const bankName = bankMap[clientId] || "Caixa Econômica Federal";
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
    const category = result.auto ? result.category : "";
    let debitAccount = "";
    let creditAccount = "";
    if (result.auto) {
      const accounts = resolveAccounts(result.category, txType, bankName);
      debitAccount = accounts.debit;
      creditAccount = accounts.credit;
    }

    return {
      id: `${clientId}-t${i + 1}`,
      date: `${months[monthIdx]}-${day}`,
      description: desc,
      amount: Math.abs(amt),
      type: txType,
      category,
      classifiedBy: result.auto ? "auto" as const : "pending" as const,
      ruleId: result.auto ? result.ruleId : undefined,
      debitAccount,
      creditAccount,
      approved: clientId === "c3",
    };
  });
}

// Generic transaction generator for any client (used on upload)
const GENERIC_DESCRIPTIONS: [string, number, string][] = [
  ["PIX REC CLIENTE", 3500, "credit"],
  ["TED RECEBIDA", 5200, "credit"],
  ["VENDA CARTAO CREDITO", 8900, "credit"],
  ["VENDA CARTAO DEBITO", 4100, "credit"],
  ["BOLETO RECEBIDO", 2700, "credit"],
  ["PGTO FOLHA", -15000, "debit"],
  ["DAS SIMPLES NACIONAL", -2800, "debit"],
  ["PGTO FORNECEDOR", -6500, "debit"],
  ["ALUGUEL IMOVEL COMERCIAL", -5000, "debit"],
  ["PGTO CONTA LUZ", -850, "debit"],
  ["PGTO CONTA AGUA", -320, "debit"],
  ["TARIFA BANCARIA MENSAL", -79.90, "debit"],
  ["PGTO INTERNET/TELEFONE", -450, "debit"],
  ["COMPRA MATERIAL ESCRITORIO", -280, "debit"],
];

export function generateGenericTransactions(clientId: string, bankName: string, period: string): Transaction[] {
  // Convert period like "Mar/2026" to "2026-03"
  const monthMap: Record<string, string> = {
    "Jan": "01", "Fev": "02", "Mar": "03", "Abr": "04", "Mai": "05", "Jun": "06",
    "Jul": "07", "Ago": "08", "Set": "09", "Out": "10", "Nov": "11", "Dez": "12",
  };
  const [monthKey, year] = period.split("/");
  const monthNum = monthMap[monthKey] || "03";
  const datePrefix = `${year}-${monthNum}`;

  return GENERIC_DESCRIPTIONS.map((item, i) => {
    const [desc, amt, type] = item;
    const txType = type as "credit" | "debit";
    const day = String(3 + (i * 2) % 26).padStart(2, "0");

    const result = classifyTransaction(desc, txType);
    const category = result.auto ? result.category : "";
    let debitAccount = "";
    let creditAccount = "";
    if (result.auto) {
      const accounts = resolveAccounts(result.category, txType, bankName);
      debitAccount = accounts.debit;
      creditAccount = accounts.credit;
    }

    return {
      id: `${clientId}-t${Date.now()}-${i}`,
      date: `${datePrefix}-${day}`,
      description: desc,
      amount: Math.abs(amt),
      type: txType,
      category,
      classifiedBy: result.auto ? "auto" as const : "pending" as const,
      ruleId: result.auto ? result.ruleId : undefined,
      debitAccount,
      creditAccount,
      approved: false,
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
      banks: ["Caixa Econômica Federal", "Banco do Brasil", "Sicoob"],
      chartOverrides: {},
      status: "classify",
      transactions: [],   // real data comes from uploaded bank statements
    },
    {
      id: "c2",
      name: "Restaurante Bom Sabor Ltda",
      cnpj: "23.456.789/0001-01",
      regime: "Simples Nacional",
      bank: "Bradesco",
      banks: ["Bradesco"],
      chartOverrides: {},
      status: "classify",
      transactions: [],
    },
    {
      id: "c3",
      name: "Auto Peças Nordeste Ltda",
      cnpj: "34.567.890/0001-12",
      regime: "Lucro Real",
      bank: "Itaú Unibanco",
      banks: ["Itaú Unibanco", "Banco do Brasil"],
      chartOverrides: {},
      status: "classify",
      transactions: [],
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
  return [];  // no mock uploads — history built from real file uploads
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

// === Supabase async store (runs alongside localStorage) ===
import { sbSelect, sbUpsert, sbDeleteAll, supabaseConfigured } from "@/lib/supabase";

/**
 * Fetch all clients + their transactions from Supabase.
 * Falls back gracefully if Supabase is not configured.
 */
export async function fetchClients(): Promise<Client[]> {
  if (!supabaseConfigured) return [];
  const [clientRows, txRows] = await Promise.all([
    sbSelect<Omit<Client, "transactions"> & { chart_overrides: Record<string, { debit: string; credit: string }> }>("clients"),
    sbSelect<{ id: string; client_id: string; date: string; description: string; amount: number; type: string; category: string; classified_by: string; rule_id?: string; debit_account?: string; credit_account?: string; approved: boolean; confidence_score?: number; accountant_note?: string; validated?: boolean; rejected_by?: string; client_description?: string; validation_flags?: ValidationFlag[] }>("transactions"),
  ]);
  return clientRows.map((c) => ({
    id: c.id,
    name: c.name,
    cnpj: c.cnpj ?? "",
    regime: c.regime ?? "",
    bank: c.bank ?? "",
    banks: (c.banks as unknown as string[]) ?? [],
    chartOverrides: (c.chart_overrides as Record<string, { debit: string; credit: string }>) ?? {},
    status: (c.status as Client["status"]) ?? "classify",
    transactions: txRows
      .filter((t) => t.client_id === c.id)
      .map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as Transaction["type"],
        category: t.category ?? "",
        classifiedBy: (t.classified_by as Transaction["classifiedBy"]) ?? "pending",
        ruleId: t.rule_id,
        debitAccount: t.debit_account,
        creditAccount: t.credit_account,
        approved: t.approved ?? false,
        confidenceScore: t.confidence_score,
        accountantNote: t.accountant_note,
        validated: t.validated,
        rejectedBy: t.rejected_by as Transaction["rejectedBy"],
        clientDescription: t.client_description,
        validationFlags: (t.validation_flags as ValidationFlag[]) ?? [],
      })),
  }));
}

/** Persist a single client (metadata only) and all its transactions to Supabase. */
export async function persistClient(client: Client): Promise<void> {
  if (!supabaseConfigured) return;
  await sbUpsert("clients", {
    id: client.id,
    name: client.name,
    cnpj: client.cnpj,
    regime: client.regime,
    bank: client.bank,
    banks: client.banks,
    chart_overrides: client.chartOverrides,
    status: client.status,
  });
  if (client.transactions.length > 0) {
    await sbUpsert(
      "transactions",
      client.transactions.map((t) => ({
        id: t.id,
        client_id: client.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        classified_by: t.classifiedBy,
        rule_id: t.ruleId,
        debit_account: t.debitAccount,
        credit_account: t.creditAccount,
        approved: t.approved,
        confidence_score: t.confidenceScore,
        accountant_note: t.accountantNote,
        validated: t.validated,
        rejected_by: t.rejectedBy,
        client_description: t.clientDescription,
        validation_flags: t.validationFlags ?? [],
      }))
    );
  }
}

/** Fetch all uploads from Supabase. */
export async function fetchUploads(): Promise<Upload[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<{ id: string; client_id: string; filename: string; bank: string; size: string; date: string; period: string; status: string }>("uploads");
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    filename: r.filename,
    bank: r.bank,
    size: r.size,
    date: r.date,
    period: r.period,
    status: r.status as Upload["status"],
  }));
}

/** Persist a single upload to Supabase. */
export async function persistUpload(upload: Upload): Promise<void> {
  if (!supabaseConfigured) return;
  await sbUpsert("uploads", {
    id: upload.id,
    client_id: upload.clientId,
    filename: upload.filename,
    bank: upload.bank,
    size: upload.size,
    date: upload.date,
    period: upload.period,
    status: upload.status,
  });
}

/**
 * One-time migration: push all localStorage data to Supabase.
 * Called on first load after Supabase is configured.
 */
export async function migrateLocalToSupabase(): Promise<void> {
  if (!supabaseConfigured) return;
  const clients = loadClients();
  const uploads = loadUploads();
  await Promise.all([
    ...clients.map(persistClient),
    ...uploads.map(persistUpload),
  ]);
}

/**
 * Apaga TODOS os dados — Supabase (cascade) + localStorage.
 * Chamada pelo painel de administração ao clicar em "Resetar Dados".
 */
export async function clearAllData(): Promise<void> {
  // 1. Supabase: deletar clients dispara CASCADE em transactions + uploads
  if (supabaseConfigured) {
    await sbDeleteAll("clients").catch(() => {});
  }
  // 2. localStorage: remover todas as chaves cf-*
  const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith("cf-"));
  keysToRemove.forEach((k) => localStorage.removeItem(k));
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
