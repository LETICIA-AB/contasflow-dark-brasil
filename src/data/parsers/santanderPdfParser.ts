import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

export const santanderPdfParser: StatementParser = {
  id: "santander-pdf",
  name: "Santander (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/santander/i.test(text)) return 0.95;
    if (/SALDO\s+EM\s+\d{2}\/\d{2}/i.test(text)) return 0.8;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];
    const MOVE_RE = /^(\d{2}\/\d{2})\s+(.+?)(?:\s+(\d{1,3}(?:\.\d{3})*,\d{2}))?(?:\s+(\d{1,3}(?:\.\d{3})*,\d{2}-))?$/;

    const currentYear = extractYear(lines) || new Date().getFullYear();
    let lastDate: string | null = null;
    let descBuffer = "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const upper = line.toUpperCase();

      if (/^DATA\s|EXTRATO|PAGINA|PÁGINA|HISTÓRICO|HISTORICO/.test(upper)) continue;
      if (/^SALDO EM/.test(upper)) continue;

      const m = MOVE_RE.exec(line);
      if (m) {
        const [dd, mm] = m[1].split("/");
        lastDate = `${currentYear}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        const desc = (descBuffer ? descBuffer + " " : "") + m[2].trim();
        descBuffer = "";

        const creditStr = m[3];
        const debitStr = m[4];

        if (creditStr) {
          const amount = parseBRNumber(creditStr);
          if (amount > 0) transactions.push({ date: lastDate, description: desc, amount, type: "credit" });
        }
        if (debitStr) {
          const amount = parseBRNumber(debitStr.replace("-", ""));
          if (amount > 0) transactions.push({ date: lastDate, description: desc, amount, type: "debit" });
        }
        if (!creditStr && !debitStr) {
          descBuffer = m[2].trim();
        }
      } else {
        if (lastDate && !isHeaderLine(line)) {
          descBuffer += (descBuffer ? " " : "") + line;
        }
      }
    }

    console.log(`[santanderPdfParser] Parsed ${transactions.length} transactions`);
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

function isHeaderLine(line: string): boolean {
  return /^(data|valor|crédito|credito|débito|debito|saldo|histórico|historico|extrato|agência|agencia|conta)/i.test(line);
}
