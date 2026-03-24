import type { Transaction, ValidationFlag, Client } from "./store";

/**
 * Validation engine for the accountant's analytical review.
 * Runs automated checks on classified transactions to flag anomalies
 * and assign confidence scores — reducing manual work.
 */

// ── Duplicate detection ──────────────────────────────────────────────
function findDuplicates(txs: Transaction[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < txs.length; i++) {
    for (let j = i + 1; j < txs.length; j++) {
      const a = txs[i], b = txs[j];
      if (
        a.amount === b.amount &&
        a.type === b.type &&
        a.date === b.date &&
        a.description === b.description
      ) {
        const msg = `Possível duplicata com ${b.id}`;
        flags.set(a.id, msg);
        flags.set(b.id, `Possível duplicata com ${a.id}`);
      }
    }
  }
  return flags;
}

// ── Unusual amount detection ─────────────────────────────────────────
function detectUnusualAmounts(txs: Transaction[]): Map<string, string> {
  const flags = new Map<string, string>();
  const byCategory = new Map<string, number[]>();

  for (const tx of txs) {
    if (!tx.category) continue;
    const arr = byCategory.get(tx.category) || [];
    arr.push(tx.amount);
    byCategory.set(tx.category, arr);
  }

  for (const tx of txs) {
    if (!tx.category) continue;
    const amounts = byCategory.get(tx.category);
    if (!amounts || amounts.length < 2) continue;

    const avg = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / amounts.length);

    if (stdDev > 0 && Math.abs(tx.amount - avg) > 2 * stdDev) {
      const pct = Math.round(((tx.amount - avg) / avg) * 100);
      flags.set(tx.id, `Valor ${pct > 0 ? "+" : ""}${pct}% da média da categoria (${tx.category})`);
    }
  }

  return flags;
}

// ── Category consistency check ───────────────────────────────────────
const EXPECTED_TYPES: Record<string, "credit" | "debit"> = {
  "Receita de Vendas": "credit",
  "Receita de Serviços": "credit",
  "Folha de Pagamento": "debit",
  "Impostos e Tributos": "debit",
  "Fornecedores / Compras": "debit",
  "Aluguel": "debit",
  "Serviços Contratados": "debit",
  "Despesas Bancárias": "debit",
  "Empréstimos e Financiamentos": "debit",
  "Retiradas dos Sócios": "debit",
};

function checkCategoryMismatch(txs: Transaction[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (const tx of txs) {
    if (!tx.category) continue;
    const expected = EXPECTED_TYPES[tx.category];
    if (expected && tx.type !== expected) {
      flags.set(
        tx.id,
        `Tipo "${tx.type === "credit" ? "Crédito" : "Débito"}" incomum para categoria "${tx.category}"`
      );
    }
  }
  return flags;
}

// ── Confidence score calculation ─────────────────────────────────────
function calculateConfidence(tx: Transaction, flags: ValidationFlag[]): number {
  let score = 100;

  // Base score by classification source
  if (tx.classifiedBy === "auto") score = 85;
  else if (tx.classifiedBy === "memory") score = 90;
  else if (tx.classifiedBy === "client") score = 60;
  else if (tx.classifiedBy === "accountant") score = 95;
  else if (tx.classifiedBy === "pending") score = 0;

  // Deductions per flag
  for (const f of flags) {
    if (f.severity === "error") score -= 25;
    else if (f.severity === "warning") score -= 15;
    else score -= 5;
  }

  // Already validated/approved boost
  if (tx.validated) score = Math.max(score, 98);
  if (tx.approved) score = 100;

  return Math.max(0, Math.min(100, score));
}

// ── Main validation pipeline ─────────────────────────────────────────
export function runValidation(client: Client): Transaction[] {
  const txs = client.transactions;
  const duplicates = findDuplicates(txs);
  const unusual = detectUnusualAmounts(txs);
  const mismatches = checkCategoryMismatch(txs);

  return txs.map((tx) => {
    const flags: ValidationFlag[] = [];

    // Pending classification
    if (tx.classifiedBy === "pending") {
      flags.push({
        type: "missing_category",
        severity: "error",
        message: "Transação não classificada",
      });
    }

    // Duplicate
    const dupMsg = duplicates.get(tx.id);
    if (dupMsg) {
      flags.push({ type: "duplicate", severity: "warning", message: dupMsg });
    }

    // Unusual amount
    const unusualMsg = unusual.get(tx.id);
    if (unusualMsg) {
      flags.push({ type: "unusual_amount", severity: "warning", message: unusualMsg });
    }

    // Category mismatch
    const mismatchMsg = mismatches.get(tx.id);
    if (mismatchMsg) {
      flags.push({ type: "category_mismatch", severity: "error", message: mismatchMsg });
    }

    // Client-classified → always flag for review
    if (tx.classifiedBy === "client") {
      flags.push({
        type: "manual_review",
        severity: "info",
        message: "Classificada pelo cliente — requer validação",
      });
    }

    // Low confidence for auto without rule
    if (tx.classifiedBy === "auto" && !tx.ruleId) {
      flags.push({
        type: "low_confidence",
        severity: "info",
        message: "Classificação automática sem regra associada",
      });
    }

    // Missing accounting accounts
    if (tx.classifiedBy !== "pending" && tx.category && (!tx.debitAccount || !tx.creditAccount)) {
      flags.push({
        type: "low_confidence",
        severity: "warning",
        message: "Contas contábeis não resolvidas — lançamento incompleto",
      });
    }

    // Debit account equals credit account (invalid double-entry)
    if (tx.debitAccount && tx.creditAccount && tx.debitAccount === tx.creditAccount) {
      flags.push({
        type: "category_mismatch",
        severity: "error",
        message: `Conta débito igual à conta crédito (${tx.debitAccount}) — lançamento inválido`,
      });
    }

    const confidenceScore = calculateConfidence(tx, flags);

    return {
      ...tx,
      validationFlags: tx.validated || tx.approved ? tx.validationFlags || [] : flags,
      confidenceScore: tx.validated || tx.approved ? tx.confidenceScore ?? 100 : confidenceScore,
    };
  });
}

// ── Analytical summary ───────────────────────────────────────────────
export interface ValidationSummary {
  total: number;
  validated: number;
  flagged: number;
  errors: number;
  warnings: number;
  avgConfidence: number;
  riskLevel: "low" | "medium" | "high";
  bySource: Record<string, number>;
}

export function getValidationSummary(txs: Transaction[]): ValidationSummary {
  const validated = txs.filter((t) => t.validated || t.approved).length;
  const withFlags = txs.filter(
    (t) => (t.validationFlags?.length ?? 0) > 0 && !t.validated && !t.approved
  );
  const errors = txs.filter((t) =>
    t.validationFlags?.some((f) => f.severity === "error") && !t.validated && !t.approved
  ).length;
  const warnings = txs.filter((t) =>
    t.validationFlags?.some((f) => f.severity === "warning") && !t.validated && !t.approved
  ).length;

  const scores = txs.map((t) => t.confidenceScore ?? 0);
  const avgConfidence = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const bySource: Record<string, number> = {};
  for (const tx of txs) {
    bySource[tx.classifiedBy] = (bySource[tx.classifiedBy] || 0) + 1;
  }

  let riskLevel: "low" | "medium" | "high" = "low";
  if (errors > 0 || avgConfidence < 60) riskLevel = "high";
  else if (warnings > 2 || avgConfidence < 80) riskLevel = "medium";

  return {
    total: txs.length,
    validated,
    flagged: withFlags.length,
    errors,
    warnings,
    avgConfidence,
    riskLevel,
    bySource,
  };
}
