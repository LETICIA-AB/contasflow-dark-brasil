import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR, parseMoneyBR, normalizeText } from "../brHelpers";

export const stonePdfParser: StatementParser = {
  id: "stone-pdf",
  name: "Stone (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 30).join("\n");
    if (/stone\s+institui/i.test(text)) return 0.95;
    if (/DESCRI[ÇC][ÃA]O.*VALOR.*SALDO/i.test(text)) return 0.85;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];
    const DATE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+/;

    for (const line of lines) {
      const dateMatch = DATE_RE.exec(line);
      if (!dateMatch) continue;

      const date = parseDataBR(dateMatch[1]);
      if (!date) continue;

      const rest = line.substring(dateMatch[0].length);
      const tipoMatch = rest.match(/^(Entrada|Sa[ií]da)\s+/i);
      if (!tipoMatch) continue;

      const tipo = tipoMatch[1].toLowerCase();
      const isDebit = tipo.startsWith("sa");
      const afterTipo = rest.substring(tipoMatch[0].length);

      // Find ALL monetary values
      const moneyParts: { value: number; index: number; length: number }[] = [];
      const moneyRe = /(-\s*)?R?\$?\s*([\d]+(?:\.[\d]{3})*,\d{2})/g;
      let m: RegExpExecArray | null;
      while ((m = moneyRe.exec(afterTipo)) !== null) {
        const isNeg = !!(m[1] && m[1].trim() === "-");
        const val = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
        if (!isNaN(val)) {
          moneyParts.push({ value: isNeg ? -val : val, index: m.index, length: m[0].length });
        }
      }

      if (moneyParts.length === 0) continue;

      const descEnd = moneyParts[0].index;
      let description = normalizeText(afterTipo.substring(0, descEnd));

      const lastMoney = moneyParts[moneyParts.length - 1];
      const afterLastMoney = afterTipo.substring(lastMoney.index + lastMoney.length).trim();
      const contraparte = afterLastMoney
        .replace(/STONE\s+INSTITUI[ÇC][ÃA]O.*$/i, "")
        .replace(/Ag:\s*\d+.*$/i, "")
        .trim();

      const parts: string[] = [];
      if (description) parts.push(description);
      if (contraparte) parts.push(contraparte);
      const fullDescription = parts.join(" | ") || tipo;

      const amount = Math.abs(moneyParts[0].value);
      if (amount === 0) continue;

      transactions.push({
        date,
        description: fullDescription,
        amount,
        type: isDebit ? "debit" : "credit",
      });
    }

    console.log(`[stonePdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};
