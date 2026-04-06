import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR } from "../brHelpers";

// Bradesco: data dd/MM, descrição, valor com sufixo - para débito
// Também pode usar colunas separadas débito/crédito
// Header típico: "Bradesco", "EXTRATO DE CONTA CORRENTE"

export const bradescoPdfParser: StatementParser = {
  id: "bradesco-pdf",
  name: "Bradesco (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/bradesco/i.test(text)) return 0.95;
    if (/bradesconet|bradescopj/i.test(text)) return 0.9;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];

    // Bradesco uses dd/MM/YYYY or dd/MM with year from header
    const DATE_FULL = /^(\d{2}\/\d{2}\/\d{4})\s+/;
    const DATE_SHORT = /^(\d{2}\/\d{2})\s+/;
    const VALOR_RE = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(-?)/;

    let currentYear = extractYear(lines) || new Date().getFullYear();

    for (const raw of lines) {
      const line = raw.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
      if (!line) continue;

      const lower = line.toLowerCase().replace(/\s/g, "");
      if (/saldo(anterior|final|dia)/.test(lower)) continue;
      if (/^data\s|^hist[oó]rico/i.test(line)) continue;

      let date: string | null = null;
      let rest = line;

      const fullMatch = DATE_FULL.exec(line);
      if (fullMatch) {
        date = parseDataBR(fullMatch[1]);
        rest = line.substring(fullMatch[0].length);
      } else {
        const shortMatch = DATE_SHORT.exec(line);
        if (shortMatch) {
          const [dd, mm] = shortMatch[1].split("/");
          date = `${currentYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
          rest = line.substring(shortMatch[0].length);
        }
      }

      if (!date) continue;

      // Find all values in the rest of the line
      const values: Array<{ val: number; isDebit: boolean; raw: string }> = [];
      const allValRe = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(-?)/g;
      let m: RegExpExecArray | null;
      while ((m = allValRe.exec(rest)) !== null) {
        const val = parseBRNumber(m[1]);
        if (val > 0) values.push({ val, isDebit: m[2] === "-", raw: m[0] });
      }

      if (values.length === 0) continue;

      // Build description by removing values
      let desc = rest;
      for (const v of values) desc = desc.replace(v.raw, "");
      desc = desc.replace(/\s{2,}/g, " ").trim();
      if (!desc) desc = "Sem descrição";

      // If multiple values, last is usually saldo — use first
      const chosen = values[0];

      // Bradesco: suffix - means debit, also check keywords
      let type: "credit" | "debit";
      if (chosen.isDebit) {
        type = "debit";
      } else if (values.length >= 2 && values[1].isDebit) {
        // Sometimes the debit marker is on the second value (saldo)
        type = "credit";
      } else {
        type = inferType(desc);
      }

      transactions.push({ date, description: desc, amount: chosen.val, type });
    }

    console.log(`[bradescoPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function extractYear(lines: string[]): number | null {
  for (const line of lines.slice(0, 30)) {
    const m = line.match(/\b(20\d{2})\b/);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function inferType(desc: string): "credit" | "debit" {
  const l = desc.toLowerCase();
  if (/pix rec|ted rec|cred|deposito|recebimento|entrada|rendimento/.test(l)) return "credit";
  return "debit";
}
