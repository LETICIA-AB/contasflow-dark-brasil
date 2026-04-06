import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

export const itauPdfParser: StatementParser = {
  id: "itau-pdf",
  name: "Itaú (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 50).join("\n");
    if (/ita[uú]/i.test(text) && /movimenta[çc][aã]o/i.test(text)) return 0.95;
    if (/ita[uú]/i.test(text)) return 0.8;
    const sample = (ctx.textLines || []).slice(0, 80).join("\n");
    const debitMatches = (sample.match(/\d{1,3}(?:\.\d{3})*,\d{2}-/g) || []).length;
    if (debitMatches >= 3) return 0.6;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];
    const LINE_RE = /^(?:(\d{2}\/\d{2})\s+)?(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2}-?)(?:\s+\d{1,3}(?:\.\d{3})*,\d{2})?$/;

    const IGNORE = [
      "SALDO APLIC AUT MAIS", "TOTAL", "EXTRATO MENSAL",
      "A = AGENDAMENTO", "B = AÇÕES", "G = APLICAÇÃO", "P = POUPANÇA",
      "PARA DEMAIS SIGLAS",
    ];

    let inMovimentacao = false;
    let currentYear = new Date().getFullYear();
    let lastDate: string | null = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const upper = line.toUpperCase();

      const yearMatch = line.match(/\b(20\d{2})\b/);
      if (yearMatch) currentYear = parseInt(yearMatch[1]);

      if (/CONTA CORRENTE.*MOVIMENTA/i.test(upper)) {
        inMovimentacao = true;
        continue;
      }

      if (upper.startsWith("SALDO FINAL")) {
        inMovimentacao = false;
        continue;
      }

      if (!inMovimentacao) continue;
      if (IGNORE.some(ig => upper.includes(ig))) continue;
      if (/^[A-Z]\s*=\s*/i.test(line)) continue;

      const m = LINE_RE.exec(line);
      if (!m) continue;

      const dateStr = m[1];
      const rawDesc = m[2].trim();
      const valorStr = m[3];

      if (dateStr) {
        const [dd, mm] = dateStr.split("/");
        lastDate = `${currentYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }

      if (!lastDate) continue;

      const isDebit = valorStr.endsWith("-");
      const amount = parseBRNumber(valorStr.replace("-", ""));
      if (amount === 0) continue;
      if (/saldo/i.test(rawDesc)) continue;

      transactions.push({
        date: lastDate,
        description: rawDesc,
        amount,
        type: isDebit ? "debit" : "credit",
      });
    }

    console.log(`[itauPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}
