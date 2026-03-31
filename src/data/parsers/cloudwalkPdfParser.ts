import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR, parseMoneyBR, normalizeText } from "../brHelpers";

export const cloudwalkPdfParser: StatementParser = {
  id: "cloudwalk-pdf",
  name: "InfinitePay / Cloudwalk (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 30).join("\n");
    if (/infinitepay|cloudwalk/i.test(text)) return 0.95;
    if (/tipo\s+de\s+transa/i.test(text)) return 0.7;
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
      const afterTime = rest.replace(/^\d{2}:\d{2}(:\d{2})?\s+/, "");

      const moneyMatch = afterTime.match(/([+-]?\s*R?\$?\s*[\d]+(?:\.[\d]{3})*,\d{2})/);
      if (!moneyMatch) continue;

      const amount = parseMoneyBR(moneyMatch[1]);
      if (amount === 0) continue;

      const descPart = afterTime.substring(0, afterTime.indexOf(moneyMatch[0])).trim();
      const description = normalizeText(descPart) || "Sem descrição";

      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type: amount >= 0 ? "credit" : "debit",
      });
    }

    console.log(`[cloudwalkPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};
