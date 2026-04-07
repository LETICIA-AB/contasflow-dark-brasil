import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/data/store";

export interface AIClassification {
  description: string;
  type: string;
  amount: number;
  category: string;
  confidence: number;
  classifiedBy: "ai" | "fallback";
}

export interface AIClassifyResult {
  classifications: AIClassification[];
  model: string;
  count: number;
}

/**
 * Send pending transactions to the classify-transaction edge function.
 * Returns classifications for each transaction.
 */
export async function classifyWithAI(
  transactions: Array<{ description: string; type: "credit" | "debit"; amount: number }>
): Promise<AIClassifyResult> {
  const { data, error } = await supabase.functions.invoke("classify-transaction", {
    body: { transactions },
  });

  if (error) {
    console.error("[classifyAI] Edge function error:", error);
    throw new Error(error.message || "Erro na classificação AI");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as AIClassifyResult;
}

/**
 * Classify pending transactions in batches of 50.
 */
export async function classifyPendingBatch(
  pendingTxs: Transaction[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, { category: string; confidence: number }>> {
  const results = new Map<string, { category: string; confidence: number }>();
  const batchSize = 50;

  for (let i = 0; i < pendingTxs.length; i += batchSize) {
    const batch = pendingTxs.slice(i, i + batchSize);
    const payload = batch.map((tx) => ({
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
    }));

    try {
      const result = await classifyWithAI(payload);
      result.classifications.forEach((cls, idx) => {
        if (cls.category && cls.category !== "Outros" && cls.confidence >= 0.7) {
          results.set(batch[idx].id, {
            category: cls.category,
            confidence: cls.confidence,
          });
        }
      });
    } catch (err) {
      console.error(`[classifyAI] Batch ${i / batchSize + 1} failed:`, err);
    }

    onProgress?.(Math.min(i + batchSize, pendingTxs.length), pendingTxs.length);
  }

  return results;
}
