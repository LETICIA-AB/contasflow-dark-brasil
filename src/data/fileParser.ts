// === Facade: delegates to ParserRegistry ===
import { registryParse, type RegistryResult } from "./parsers/registry";

export interface ParsedTransaction {
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;     // always positive
  type: "credit" | "debit";
}

/**
 * Parse a bank statement file using the parser registry.
 * Returns the registry result with transactions + parser info.
 */
export async function parseFile(file: File, textContent?: string, buffer?: ArrayBuffer): Promise<RegistryResult> {
  return registryParse(file, textContent, buffer);
}

// Re-export individual parsers for backward compatibility
export { parseCSVContent as parseCSV } from "./parsers/csvGenericParser";
export { parseCSVWithMapping } from "./parsers/csvGenericParser";
export { getCSVHeaders } from "./parsers/csvGenericParser";
export { getXlsxHeaders } from "./parsers/xlsxParser";
