import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

// Nubank PJ: data dd MMM (ex: "03 MAR"), valor com prefixo - para débito
// ou R$ sem sinal para crédito. Layout típico: "NU PAGAMENTOS", "nubank"
// Valores: "R$ 1.500,00" (crédito) ou "- R$ 650,00" (débito)

const MESES_ABREV: Record<string, string> = {
  JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06",
  JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12",
};

export const nubankPjPdfParser: StatementParser = {
  id: "nubank-pj-pdf",
  name: "Nubank PJ (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/nubank|nu pagamentos|nu instituição/i.test(text)) return 0.95;
    if (/roxinho|nu\.com/i.test(text)) return 0.85;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];

    let currentYear = extractYear(lines) || new Date().getFullYear();

    // Nubank patterns:
    // "03 MAR PIX RECEBIDO FULANO R$ 1.500,00"
    // "05 MAR PAGAMENTO BOLETO - R$ 650,00"
    // Or date on one line, description + value on next
    const DATE_ABREV = /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b/i;
    const DATE_FULL = /^(\d{2}\/\d{2}\/\d{4})/;
    const VALOR_RE = /(-?\s*R\$\s*[\d.]+,\d{2})/;

    let currentDate: string | null = null;
    let descBuffer = "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const lower = line.toLowerCase();

      // Skip headers/footers
      if (/nubank|extrato|saldo.*dia|saldo.*anterior|saldo.*final/i.test(lower)) continue;
      if (/^data\s|^descri[çc]/i.test(line)) continue;

      // Check for abbreviated date: "03 MAR"
      const abrevMatch = DATE_ABREV.exec(line);
      if (abrevMatch) {
        const dd = abrevMatch[1].padStart(2, "0");
        const mm = MESES_ABREV[abrevMatch[2].toUpperCase()] || "01";
        currentDate = `${currentYear}-${mm}-${dd}`;
        // Rest of line may contain description + value
        const rest = line.substring(abrevMatch[0].length).trim();
        if (rest) {
          const result = extractTransaction(rest, currentDate);
          if (result) {
            transactions.push(result);
            descBuffer = "";
            continue;
          }
          descBuffer = rest;
        }
        continue;
      }

      // Check for full date
      const fullMatch = DATE_FULL.exec(line);
      if (fullMatch) {
        const parts = fullMatch[1].split("/");
        currentDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        const rest = line.substring(fullMatch[0].length).trim();
        if (rest) {
          const result = extractTransaction(rest, currentDate);
          if (result) {
            transactions.push(result);
            descBuffer = "";
            continue;
          }
          descBuffer = rest;
        }
        continue;
      }

      if (!currentDate) continue;

      // Try to extract value from current line
      const valMatch = VALOR_RE.exec(line);
      if (valMatch) {
        let descLine = line.replace(valMatch[0], "").trim();
        const fullDesc = (descBuffer ? descBuffer + " " + descLine : descLine).replace(/\s{2,}/g, " ").trim();
        descBuffer = "";

        const rawVal = valMatch[1];
        const isNeg = /^-\s*/.test(rawVal.trim());
        const numStr = rawVal.replace(/[^\d,]/g, "").replace(",", ".");
        const value = parseFloat(numStr) || 0;

        if (value > 0 && fullDesc && !fullDesc.toLowerCase().includes("saldo")) {
          transactions.push({
            date: currentDate,
            description: fullDesc,
            amount: value,
            type: isNeg ? "debit" : "credit",
          });
        }
      } else {
        descBuffer += (descBuffer ? " " : "") + line;
      }
    }

    console.log(`[nubankPjPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function extractTransaction(text: string, date: string): ParsedTransaction | null {
  const VALOR_RE = /(-?\s*R\$\s*[\d.]+,\d{2})/;
  const valMatch = VALOR_RE.exec(text);
  if (!valMatch) return null;

  const desc = text.replace(valMatch[0], "").replace(/\s{2,}/g, " ").trim();
  if (!desc || desc.toLowerCase().includes("saldo")) return null;

  const rawVal = valMatch[1];
  const isNeg = /^-\s*/.test(rawVal.trim());
  const numStr = rawVal.replace(/[^\d,]/g, "").replace(",", ".");
  const value = parseFloat(numStr) || 0;
  if (value === 0) return null;

  return { date, description: desc, amount: value, type: isNeg ? "debit" : "credit" };
}

function extractYear(lines: string[]): number | null {
  for (const line of lines.slice(0, 30)) {
    const m = line.match(/\b(20\d{2})\b/);
    if (m) return parseInt(m[1]);
  }
  return null;
}
