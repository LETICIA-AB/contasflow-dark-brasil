// === Accounting Data Models ===
// BankTransaction → AccountingEntry → AccountingSplit

export interface BankTransaction {
  id: string;
  empresa_id: string;
  date: string; // YYYY-MM-DD
  type: "Entrada" | "Saída";
  description_raw: string;
  description_full: string;
  amount: number; // always positive
  balance?: number;
  bank: string;
  source_file_id?: string;
  created_at: string; // ISO timestamp
}

export interface AccountingEntry {
  id: string;
  bank_transaction_id: string;
  date: string;
  document_number: string;
  original_amount: number;
  status: "pendente" | "classificado" | "contabilizado";
}

export interface AccountingSplit {
  id: string;
  accounting_entry_id: string;
  history: string; // histórico contábil
  amount: number;
  debit_account: string;
  credit_account: string;
}

// === localStorage Keys ===
const KEYS = {
  bankTransactions: "cf-bank-transactions",
  accountingEntries: "cf-accounting-entries",
  accountingSplits: "cf-accounting-splits",
};

// === CRUD Helpers ===
export function loadBankTransactions(): BankTransaction[] {
  const raw = localStorage.getItem(KEYS.bankTransactions);
  return raw ? JSON.parse(raw) : [];
}

export function saveBankTransactions(txs: BankTransaction[]) {
  localStorage.setItem(KEYS.bankTransactions, JSON.stringify(txs));
}

export function loadAccountingEntries(): AccountingEntry[] {
  const raw = localStorage.getItem(KEYS.accountingEntries);
  return raw ? JSON.parse(raw) : [];
}

export function saveAccountingEntries(entries: AccountingEntry[]) {
  localStorage.setItem(KEYS.accountingEntries, JSON.stringify(entries));
}

export function loadAccountingSplits(): AccountingSplit[] {
  const raw = localStorage.getItem(KEYS.accountingSplits);
  return raw ? JSON.parse(raw) : [];
}

export function saveAccountingSplits(splits: AccountingSplit[]) {
  localStorage.setItem(KEYS.accountingSplits, JSON.stringify(splits));
}

// === Import Helper ===
// Creates BankTransaction + AccountingEntry + AccountingSplit from parsed data
import type { ParsedTransaction } from "./fileParser";
import { classifyTransaction } from "./classificationRules";
import { resolveAccounts } from "./chartOfAccounts";
import { findInMemory } from "./memoryStore";

export interface ImportResult {
  bankTransactions: BankTransaction[];
  entries: AccountingEntry[];
  splits: AccountingSplit[];
  autoCount: number;
  pendingCount: number;
  skippedCount: number;
}

export function importParsedTransactions(
  parsed: ParsedTransaction[],
  empresaId: string,
  bank: string,
  sourceFileId?: string,
  chartOverrides?: Record<string, { debit: string; credit: string }>
): ImportResult {
  const existing = loadBankTransactions();
  const existingHashes = new Set(
    existing.filter(t => t.empresa_id === empresaId).map(t => `${t.date}|${t.description_full}|${t.amount}|${t.type}`)
  );

  const newBankTxs: BankTransaction[] = [];
  const newEntries: AccountingEntry[] = [];
  const newSplits: AccountingSplit[] = [];
  let autoCount = 0;
  let pendingCount = 0;
  let skippedCount = 0;

  const now = new Date().toISOString();

  parsed.forEach((p, i) => {
    const txType: "Entrada" | "Saída" = p.type === "credit" ? "Entrada" : "Saída";
    const hash = `${p.date}|${p.description}|${p.amount}|${txType}`;
    if (existingHashes.has(hash)) {
      skippedCount++;
      return;
    }
    existingHashes.add(hash);

    const btId = `bt-${Date.now()}-${i}`;
    const aeId = `ae-${Date.now()}-${i}`;
    const asId = `as-${Date.now()}-${i}`;
    const docNum = `DOC-${String(existing.length + newBankTxs.length + 1).padStart(5, "0")}`;

    // Classification
    const classText = `${txType} ${p.description}`;
    const mem = findInMemory(p.description, empresaId);
    let history = p.description;
    let debitAccount = "";
    let creditAccount = "";
    let status: AccountingEntry["status"] = "pendente";

    if (mem) {
      history = mem.category + " - " + p.description;
      debitAccount = mem.debitAccount;
      creditAccount = mem.creditAccount;
      status = "classificado";
      autoCount++;
    } else {
      const result = classifyTransaction(classText, p.type);
      if (result.auto) {
        const accounts = resolveAccounts(result.category, p.type, bank, chartOverrides);
        history = result.category + " - " + p.description;
        debitAccount = accounts.debit;
        creditAccount = accounts.credit;
        status = "classificado";
        autoCount++;
      } else {
        pendingCount++;
      }
    }

    newBankTxs.push({
      id: btId,
      empresa_id: empresaId,
      date: p.date,
      type: txType,
      description_raw: p.description,
      description_full: p.description,
      amount: p.amount,
      balance: (p as any).balance,
      bank,
      source_file_id: sourceFileId,
      created_at: now,
    });

    newEntries.push({
      id: aeId,
      bank_transaction_id: btId,
      date: p.date,
      document_number: docNum,
      original_amount: p.amount,
      status,
    });

    newSplits.push({
      id: asId,
      accounting_entry_id: aeId,
      history,
      amount: p.amount,
      debit_account: debitAccount,
      credit_account: creditAccount,
    });
  });

  // Persist
  saveBankTransactions([...existing, ...newBankTxs]);
  saveAccountingEntries([...loadAccountingEntries(), ...newEntries]);
  saveAccountingSplits([...loadAccountingSplits(), ...newSplits]);

  return { bankTransactions: newBankTxs, entries: newEntries, splits: newSplits, autoCount, pendingCount, skippedCount };
}
