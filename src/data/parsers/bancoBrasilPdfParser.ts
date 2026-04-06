import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR } from "../brHelpers";

export const bancoBrasilPdfParser: StatementParser = {
  id: "bb-pdf",
  name: "Banco do Brasil (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n").toLowerCase();
    if (/banco do brasil|bb\.com\.br|bancobrasil/i.test(text)) return 0.95;
    const sample = (ctx.textLines || []).slice(0, 60).join("\n");
    const cdMatches = (sample.match(/\d{1,3}(?:\.\d{3})*,\d{2}\s*[CD]\b/g) || []).length;
    if (cdMatches >= 3) return 0.75;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];
    const DATE_START = /^\s*(\d{2}\/\d{2}\/\d{4})\b/;
    const VALOR_CD = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])\b/g;
    const VALOR_ONLY = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;

    for (const raw of lines) {
      const line = raw.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
      if (!line) continue;

      const dateMatch = DATE_START.exec(line);
      if (!dateMatch) continue;

      const date = parseDataBR(dateMatch[1]);
      if (!date) continue;

      const lower = line.toLowerCase().replace(/\s/g, "");
      if (lower.includes("saldoanterior") || lower.includes("saldofinal") || lower.includes("saldodia")) continue;

      const pairs: { value: number; cd: "C" | "D"; index: number }[] = [];
      let m: RegExpExecArray | null;
      VALOR_CD.lastIndex = 0;
      while ((m = VALOR_CD.exec(line)) !== null) {
        const val = parseBRNumber(m[1]);
        if (val > 0) pairs.push({ value: val, cd: m[2].toUpperCase() as "C" | "D", index: m.index });
      }

      const validPairs = pairs.filter(p => p.value > 0);

      if (validPairs.length === 0) {
        VALOR_ONLY.lastIndex = 0;
        const allVals: number[] = [];
        while ((m = VALOR_ONLY.exec(line)) !== null) {
          const val = parseBRNumber(m[1]);
          if (val > 0) allVals.push(val);
        }
        if (allVals.length === 0) continue;
        const amount = allVals[0];
        const type = inferType(line);
        const description = extractDescription(line, dateMatch[1]);
        if (description && amount > 0) {
          transactions.push({ date, description, amount, type });
        }
        continue;
      }

      let chosen = validPairs[0];
      const cPair = validPairs.find(p => p.cd === "C");
      const dPair = validPairs.find(p => p.cd === "D");
      if (cPair && !dPair) chosen = cPair;
      else if (dPair && !cPair) chosen = dPair;
      else if (cPair && dPair) chosen = cPair;

      const type: "credit" | "debit" = chosen.cd === "C" ? "credit" : "debit";
      const description = extractDescription(line, dateMatch[1]);
      if (!description || chosen.value === 0) continue;

      transactions.push({ date, description, amount: chosen.value, type });
    }

    console.log(`[bancoBrasilPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function extractDescription(line: string, dateStr: string): string {
  let desc = line.replace(new RegExp(`^\\s*${escapeRegex(dateStr)}\\s*`), "");
  desc = desc.replace(/^(?:\d+\s+){1,6}/, "");
  desc = desc.replace(/\d{1,3}(?:\.\d{3})*,\d{2}\s*[CDcd]\b/g, "");
  desc = desc.replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, "");
  return desc.replace(/\s{2,}/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferType(line: string): "credit" | "debit" {
  const l = line.toLowerCase();
  if (/pix rec|ted rec|cred pix|deposito|recebimento|entrada/.test(l)) return "credit";
  return "debit";
}
