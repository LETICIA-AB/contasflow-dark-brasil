import type { Transaction } from "./store";
import type { AuditLayerData, AuditLayerStatus } from "./store";
import { CLASSIFICATION_RULES } from "./classificationRules";

/**
 * Derives the 4 reconciliation audit layers for a transaction:
 *
 * 1. Input            — raw bank statement data as received
 * 2. Automação        — regex/rule-engine classification result
 * 3. Sugestão IA      — AI memory or confidence-score suggestion
 * 4. Descrição cliente — manual classification or description by the client
 */
export function buildAuditLayers(tx: Transaction): AuditLayerData[] {
  // ── Layer 1: Input ─────────────────────────────────────────────────
  const inputLayer: AuditLayerData = {
    layer: "input",
    label: "Input",
    sublabel: "Dados do extrato bancário",
    status: "pass",
    details: {
      Descrição: tx.description,
      Valor: `R$ ${tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      Tipo: tx.type === "credit" ? "Crédito" : "Débito",
      Data: tx.date,
    },
  };

  // ── Layer 2: Automação (regex rules engine) ─────────────────────────
  const rule = tx.ruleId ? CLASSIFICATION_RULES.find((r) => r.id === tx.ruleId) : undefined;
  const automationStatus: AuditLayerStatus = tx.ruleId ? "pass" : "skip";
  const automationDetails: Record<string, string | number | undefined> = {};

  if (rule) {
    automationDetails["Regra"] = rule.id;
    automationDetails["Categoria sugerida"] = rule.category;
    automationDetails["Padrão"] = rule.pattern.source;
    automationDetails["Exemplos"] = rule.examples.slice(0, 2).join(", ");
  } else if (automationStatus === "skip") {
    automationDetails["Resultado"] = "Nenhuma regra correspondeu à descrição";
  }

  const automationLayer: AuditLayerData = {
    layer: "automation",
    label: "Automação",
    sublabel: "Motor de regras",
    status: automationStatus,
    details: automationDetails,
  };

  // ── Layer 3: Sugestão IA (memory / confidence) ──────────────────────
  // "override" = a rule/memory suggestion existed but a human picked a different category
  let aiStatus: AuditLayerStatus;
  const aiDetails: Record<string, string | number | undefined> = {};

  if (tx.classifiedBy === "memory") {
    aiStatus = "pass";
    aiDetails["Fonte"] = "Memória IA (padrão aprendido)";
    aiDetails["Categoria"] = tx.category;
    aiDetails["Confiança"] = `${tx.confidenceScore ?? 0}%`;
  } else if (tx.classifiedBy === "auto" && tx.ruleId) {
    aiStatus = "pass";
    aiDetails["Fonte"] = `Regra automática ${tx.ruleId}`;
    aiDetails["Categoria"] = tx.category;
    aiDetails["Confiança"] = `${tx.confidenceScore ?? 0}%`;
  } else if (tx.classifiedBy === "accountant" && tx.ruleId) {
    // Accountant reclassified a transaction that had been auto-matched by a rule.
    // ruleId is preserved on the tx object even after manual override.
    const originalCategory = rule?.category;
    if (originalCategory && originalCategory !== tx.category) {
      aiStatus = "override";
      aiDetails["Regra original"] = tx.ruleId;
      aiDetails["Sugestão da regra"] = originalCategory;
      aiDetails["Reclassificado para"] = tx.category;
    } else {
      // Accountant validated the same category the rule suggested
      aiStatus = "pass";
      aiDetails["Fonte"] = `Regra ${tx.ruleId} (confirmada pelo contador)`;
      aiDetails["Categoria"] = tx.category;
    }
    aiDetails["Confiança"] = `${tx.confidenceScore ?? 0}%`;
  } else if (tx.classifiedBy === "client" && tx.ruleId) {
    // Client confirmed or changed a rule suggestion
    const originalCategory = rule?.category;
    if (originalCategory && originalCategory !== tx.category) {
      aiStatus = "override";
      aiDetails["Regra original"] = tx.ruleId;
      aiDetails["Sugestão da regra"] = originalCategory;
      aiDetails["Cliente classificou como"] = tx.category;
    } else {
      aiStatus = "pass";
      aiDetails["Fonte"] = `Regra ${tx.ruleId} (confirmada pelo cliente)`;
      aiDetails["Categoria"] = tx.category;
    }
    aiDetails["Confiança"] = `${tx.confidenceScore ?? 0}%`;
  } else if (tx.classifiedBy === "pending") {
    aiStatus = "pending";
    aiDetails["Resultado"] = "Sem sugestão — aguardando classificação";
  } else {
    aiStatus = "skip";
    aiDetails["Resultado"] = "Classificado manualmente sem correspondência de regra";
  }

  const aiLayer: AuditLayerData = {
    layer: "ai_suggestion",
    label: "Sugestão IA",
    sublabel: "Memória e confiança",
    status: aiStatus,
    details: aiDetails,
  };

  // ── Layer 4: Descrição do cliente ───────────────────────────────────
  let clientStatus: AuditLayerStatus;
  const clientDetails: Record<string, string | number | undefined> = {};

  if (tx.classifiedBy === "client") {
    clientStatus = "pass";
    clientDetails["Categoria informada"] = tx.category;
    if (tx.clientDescription) clientDetails["Descrição"] = tx.clientDescription;
    clientDetails["Status"] = "Classificado pelo cliente";
  } else if (tx.clientDescription && tx.classifiedBy !== "client") {
    clientStatus = "pass";
    clientDetails["Descrição"] = tx.clientDescription;
    clientDetails["Status"] = "Descrição livre fornecida";
  } else if (tx.classifiedBy === "pending") {
    clientStatus = "pending";
    clientDetails["Status"] = "Aguardando ação do cliente";
  } else {
    clientStatus = "skip";
    clientDetails["Status"] =
      tx.classifiedBy === "accountant"
        ? "Classificado pelo contador (sem interação do cliente)"
        : "Cliente não interagiu com esta transação";
  }

  const clientLayer: AuditLayerData = {
    layer: "client_description",
    label: "Descrição do Cliente",
    sublabel: "Classificação manual",
    status: clientStatus,
    details: clientDetails,
  };

  return [inputLayer, automationLayer, aiLayer, clientLayer];
}

/** Summary stats for all 4 layers across a set of transactions */
export interface AuditSummary {
  inputTotal: number;
  automationPassed: number;
  automationSkipped: number;
  aiPassed: number;
  aiOverridden: number;
  aiPending: number;
  clientPassed: number;
  clientPending: number;
  clientSkipped: number;
}

export function getAuditSummary(txs: Transaction[]): AuditSummary {
  let automationPassed = 0, automationSkipped = 0;
  let aiPassed = 0, aiOverridden = 0, aiPending = 0;
  let clientPassed = 0, clientPending = 0, clientSkipped = 0;

  for (const tx of txs) {
    const layers = buildAuditLayers(tx);
    const [, auto, ai, client] = layers;

    if (auto.status === "pass") automationPassed++;
    else automationSkipped++;

    if (ai.status === "pass") aiPassed++;
    else if (ai.status === "override") aiOverridden++;
    else if (ai.status === "pending") aiPending++;

    if (client.status === "pass") clientPassed++;
    else if (client.status === "pending") clientPending++;
    else clientSkipped++;
  }

  return {
    inputTotal: txs.length,
    automationPassed,
    automationSkipped,
    aiPassed,
    aiOverridden,
    aiPending,
    clientPassed,
    clientPending,
    clientSkipped,
  };
}
