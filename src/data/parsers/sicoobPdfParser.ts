import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

const PERIODO_RE = /PER[IÍ]ODO:?\s*(\d{2})\/(\d{2})\/(20\d{2})/i;
const LINHA_RE = /^(\d{2}\/\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC*])/i;

export const sicoobPdfParser: StatementParser = {
  id: "sicoob-pdf",
  name: "Sicoob (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/sicoob/i.test(text)) return 0.95;
    if (/PER[IÍ]ODO:/i.test(text)) return 0.6;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];

    let year = new Date().getFullYear();
    const fullText = lines.join("\n");
    const periodoMatch = PERIODO_RE.exec(fullText);
    if (periodoMatch) year = parseInt(periodoMatch[3]);

    const blocks: string[] = [];
    let current = "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (/^\d{2}\/\d{2}\s/.test(line)) {
        if (current) blocks.push(current);
        current = line;
      } else {
        current += " " + line;
      }
    }
    if (current) blocks.push(current);

    for (const block of blocks) {
      const normalized = block.replace(/\s{2,}/g, " ").trim();
      if (/saldo|resumo/i.test(normalized)) continue;

      const m = LINHA_RE.exec(normalized);
      if (!m) continue;

      const [dd, mm] = m[1].split("/");
      const date = `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      const amount = parseBRNumber(m[3]);
      const cd = m[4].toUpperCase();

      if (amount === 0) continue;

      let desc = m[2].trim();
      desc = desc.replace(/DOC\.?:/gi, "").replace(/\*/g, "").replace(/\s{2,}/g, " ").trim();

      transactions.push({
        date,
        description: desc || "Sem descrição",
        amount,
        type: cd === "D" ? "debit" : "credit",
      });
    }

    console.log(`[sicoobPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}
