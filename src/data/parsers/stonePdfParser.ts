import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR, parseMoneyBR, normalizeText } from "../brHelpers";

const HEADER_PATTERNS = [
  /extrato de conta/i,
  /emitido em/i,
  /p[aá]gina\s+\d+\s+de\s+\d+/i,
  /per[ií]odo\s*:/i,
  /DATA\s+TIPO\s+DESCRI/i,
  /VALOR\s+SALDO/i,
  /^CONTRAPARTE$/i,
  /stone\s+institui/i,
  /^CNPJ/i,
  /^Ag:\s*\d/i,
  /^Conta:\s*\d/i,
];

function isHeaderLine(line: string): boolean {
  return HEADER_PATTERNS.some((re) => re.test(line));
}

/**
 * Stone PDF parser — block-based approach.
 * A block starts with a date line (DD/MM/YY or DD/MM/YYYY) + type (Entrada/Saída).
 * Subsequent lines are accumulated as description until a monetary value is found.
 * Second monetary value on a line (or after amount) is treated as balance.
 */
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

    // Regex for block start: date + type
    const DATE_TYPE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+(Entrada|Sa[ií]da)\b/i;
    // Regex for monetary values
    const MONEY_RE = /(-\s*)?R?\$?\s*([\d]+(?:\.[\d]{3})*,\d{2})/g;

    interface Block {
      date: string;
      type: "credit" | "debit";
      descLines: string[];
      amount?: number;
      balance?: number;
    }

    const blocks: Block[] = [];
    let current: Block | null = null;
    // Lines that appear before the next date line — likely section headers like "Recebimento vendas"
    let pendingDescLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const startMatch = DATE_TYPE_RE.exec(line);
      if (startMatch) {
        // Flush previous block
        if (current && current.amount != null) {
          blocks.push(current);
        }

        const date = parseDataBR(startMatch[1]);
        if (!date) {
          pendingDescLines = [];
          continue;
        }

        const tipo = startMatch[2].toLowerCase();
        const isDebit = tipo.startsWith("sa");

        current = {
          date,
          type: isDebit ? "debit" : "credit",
          descLines: pendingDescLines.filter((l) => !isHeaderLine(l)),
        };
        pendingDescLines = [];

        // Rest of the line after date+type might contain description or values
        const afterType = line.substring(startMatch[0].length).trim();
        if (afterType) {
          // Check if it contains monetary values
          const moneyValues = extractMoneyValues(afterType);
          if (moneyValues.length > 0) {
            // Text before first money is description
            const firstMoneyIdx = afterType.search(MONEY_RE);
            if (firstMoneyIdx > 0) {
              const desc = afterType.substring(0, firstMoneyIdx).trim();
              if (desc) current.descLines.push(desc);
            }
            current.amount = moneyValues[0];
            if (moneyValues.length > 1) current.balance = moneyValues[moneyValues.length - 1];
          } else {
            current.descLines.push(afterType);
          }
        }
        continue;
      }

      // Not a block start — accumulate into current block or save as pending
      if (current) {
        if (current.amount != null) {
          // Already have amount — this line might be contraparte or trailing info
          const cleaned = normalizeText(line)
            .replace(/STONE\s+INSTITUI[ÇC][ÃA]O.*$/i, "")
            .replace(/Ag:\s*\d+.*$/i, "")
            .trim();
          if (cleaned && cleaned.length > 2 && !isHeaderLine(cleaned)) {
            current.descLines.push(cleaned);
          }
          continue;
        }

        // Try to extract money from this line
        const moneyValues = extractMoneyValues(line);
        if (moneyValues.length > 0) {
          // Text before first money is part of description
          MONEY_RE.lastIndex = 0;
          const firstMatch = MONEY_RE.exec(line);
          if (firstMatch && firstMatch.index > 0) {
            const desc = line.substring(0, firstMatch.index).trim();
            if (desc) current.descLines.push(desc);
          }
          current.amount = moneyValues[0];
          if (moneyValues.length > 1) current.balance = moneyValues[moneyValues.length - 1];
        } else {
          // Pure description line
          const cleaned = normalizeText(line)
            .replace(/STONE\s+INSTITUI[ÇC][ÃA]O.*$/i, "")
            .replace(/Ag:\s*\d+.*$/i, "")
            .trim();
          if (cleaned && cleaned.length > 1 && !isHeaderLine(cleaned)) {
            current.descLines.push(cleaned);
          }
        }
      } else {
        // No current block — save as pending for the next block
        const cleaned = normalizeText(line)
          .replace(/STONE\s+INSTITUI[ÇC][ÃA]O.*$/i, "")
          .replace(/Ag:\s*\d+.*$/i, "")
          .replace(/DESCRI[ÇC][ÃA]O.*VALOR.*SALDO/i, "")
          .replace(/Per[ií]odo.*\d{2}\/\d{2}/i, "")
          .trim();
        if (cleaned && cleaned.length > 2 && !extractMoneyValues(cleaned).length) {
          pendingDescLines.push(cleaned);
          // Keep only last 3 pending lines to avoid accumulating headers
          if (pendingDescLines.length > 3) pendingDescLines.shift();
        }
      }
    }

    // Flush last block
    if (current && current.amount != null) {
      blocks.push(current);
    }

    // Convert blocks to transactions
    for (const block of blocks) {
      if (!block.amount || block.amount === 0) continue;

      const descFull = block.descLines
        .filter((d) => d.length > 0)
        .join(" | ");

      const description = descFull || (block.type === "credit" ? "Entrada" : "Saída");

      transactions.push({
        date: block.date,
        description,
        amount: Math.abs(block.amount),
        type: block.type,
        balance: block.balance,
      } as ParsedTransaction & { balance?: number });
    }

    console.log(`[stonePdfParser] Parsed ${transactions.length} transactions from ${blocks.length} blocks`);
    return transactions;
  },
};

function extractMoneyValues(text: string): number[] {
  const re = /(-\s*)?R?\$?\s*([\d]+(?:\.[\d]{3})*,\d{2})/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const isNeg = !!(m[1] && m[1].trim() === "-");
    const val = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val)) {
      values.push(isNeg ? -val : val);
    }
  }
  return values;
}
