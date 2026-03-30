/**
 * Brazilian financial data parsing helpers.
 * Used across OFX, CSV, and PDF parsers for consistent normalization.
 */

/**
 * Parse a Brazilian date string (DD/MM/YY or DD/MM/YYYY) to ISO format (YYYY-MM-DD).
 * Returns null if input doesn't match expected patterns.
 */
export function parseDataBR(raw: string): string | null {
  const trimmed = raw.trim();

  // DD/MM/YYYY or DD/MM/YY
  const brMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    let year = brMatch[3];
    if (year.length === 2) {
      year = (parseInt(year) > 50 ? "19" : "20") + year;
    }
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD (already ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  // YYYY/MM/DD
  const isoSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (isoSlash) return `${isoSlash[1]}-${isoSlash[2]}-${isoSlash[3]}`;

  return null;
}

/**
 * Parse a Brazilian money string to a number.
 * Handles: "R$ 1.234,56", "- R$ 0,30", "+24,66", "1234.56", "-1.500,00"
 * Returns the numeric value (negative if prefixed with -).
 */
export function parseMoneyBR(raw: string): number {
  let cleaned = raw.trim();
  if (!cleaned) return 0;

  // Detect negative: can be "- R$ 0,30" or "-R$0,30" or "-0,30"
  const isNegative = /^-/.test(cleaned);
  cleaned = cleaned.replace(/^[+-]\s*/, "");

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/R\s*\$/g, "").replace(/\s/g, "");

  if (!cleaned) return 0;

  // Detect format: if has both . and , the last one is the decimal separator
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  if (lastComma > lastDot) {
    // Brazilian: 1.234,56 → remove dots, comma → dot
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // US/international: 1,234.56 → remove commas
    cleaned = cleaned.replace(/,/g, "");
  } else {
    // Only one separator or none
    cleaned = cleaned.replace(",", ".");
  }

  const val = parseFloat(cleaned) || 0;
  return isNegative ? -val : val;
}

/**
 * Normalize text: trim, collapse whitespace, consistent casing.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ");
}
