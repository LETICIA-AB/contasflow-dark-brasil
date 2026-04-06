import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

// PagBank (PagSeguro): data dd/MM ou dd/MM/YYYY, valor com R$,
// débito indicado por "- R$" ou sufixo "-"
// Header típico: "PagBank", "PagSeguro", "pagseguro.uol"

export const pagbankPdfParser: StatementParser = {
  id: "pagbank-pdf",
  name: "PagBank (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/pagbank|pagseguro|pagseguro\.uol/i.test(text)) return 0.95;
    if (/uol pagamentos/i.test(text)) return 0.85;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];

    const DATE_FULL = /^(\d{2}\/\d{2}\/\d{4})\s+/;
    const DATE_SHORT = /^(\d{2}\/\d{2})\s+/;
    const VALOR_RS = /(-?\s*R\$\s*[\d.]+,\d{2})/;
    const VALOR_PLAIN = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(-?)/;

    let currentYear = extractYear(lines) || new Date().getFullYear();

    for (const raw of lines) {
      const line = raw.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (/saldo|extrato|pagbank|pagseguro|^data\s|^descri/i.test(lower) && !/pix|pagamento|transfer/i.test(lower)) continue;

      let date: string | null = null;
      let rest = line;

      const fullMatch = DATE_FULL.exec(line);
      if (fullMatch) {
        const parts = fullMatch[1].split("/");
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
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

      // Try R$ pattern first
      const rsMatch = VALOR_RS.exec(rest);
      if (rsMatch) {
        const rawVal = rsMatch[1];
        const isNeg = /^-\s*/.test(rawVal.trim());
        const numStr = rawVal.replace(/[^\d,]/g, "").replace(",", ".");
        const value = parseFloat(numStr) || 0;

        if (value > 0) {
          const desc = rest.replace(rsMatch[0], "").replace(/\s{2,}/g, " ").trim();
          if (desc && !desc.toLowerCase().includes("saldo")) {
            transactions.push({ date, description: desc, amount: value, type: isNeg ? "debit" : "credit" });
            continue;
          }
        }
      }

      // Try plain value pattern
      const plainMatch = VALOR_PLAIN.exec(rest);
      if (plainMatch) {
        const val = parseBRNumber(plainMatch[1]);
        const isDebit = plainMatch[2] === "-";

        if (val > 0) {
          let desc = rest.replace(plainMatch[0], "").replace(/\s{2,}/g, " ").trim();
          // Remove trailing saldo value
          desc = desc.replace(/\d{1,3}(?:\.\d{3})*,\d{2}\s*-?\s*$/, "").trim();
          if (!desc) desc = "Sem descrição";
          if (!desc.toLowerCase().includes("saldo")) {
            transactions.push({
              date,
              description: desc,
              amount: val,
              type: isDebit ? "debit" : inferType(desc),
            });
          }
        }
      }
    }

    console.log(`[pagbankPdfParser] Parsed ${transactions.length} transactions`);
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
  if (/pix rec|ted rec|cred|deposito|recebimento|entrada|rendimento|venda/.test(l)) return "credit";
  return "debit";
}
