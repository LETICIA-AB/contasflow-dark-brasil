import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR, parseMoneyBR } from "../brHelpers";

export const csvGenericParser: StatementParser = {
  id: "csv-generic",
  name: "CSV Genérico",
  supportedFormats: ["csv", "txt"],

  canParse(ctx: ParserContext): number {
    const text = ctx.textContent || "";
    if (!text.trim()) return 0;
    const lines = text.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
    if (lines.length < 2) return 0;
    const sep = detectSeparator(lines[0]);
    const header = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const dateCol = findColumn(header, DATE_CANDIDATES);
    const descCol = findColumn(header, DESC_CANDIDATES);
    if (dateCol >= 0 && descCol >= 0) return 0.7;
    // Positional fallback
    const firstDataLine = lines[1];
    if (firstDataLine && /\d{2}[/\-.]\d{2}[/\-.]\d{2,4}/.test(firstDataLine)) return 0.4;
    return 0.2;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const content = ctx.textContent || "";
    return parseCSVContent(content);
  },
};

// Column mapping support
export interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  typeCol?: number;
}

export function parseCSVWithMapping(content: string, mapping: ColumnMapping): ParsedTransaction[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = detectSeparator(lines[0]);
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    const rawDate = clean(cols[mapping.dateCol] || "");
    const description = clean(cols[mapping.descCol] || "");
    const date = parseDataBR(rawDate);
    if (!date || !description) continue;

    const val = parseMoneyBR(cols[mapping.amountCol] || "0");
    if (val === 0) continue;

    let type: "credit" | "debit" = val >= 0 ? "credit" : "debit";
    if (mapping.typeCol !== undefined && cols[mapping.typeCol]) {
      const t = clean(cols[mapping.typeCol]).toLowerCase();
      if (t.includes("créd") || t.includes("cred") || t.includes("entrada")) type = "credit";
      else if (t.includes("déb") || t.includes("deb") || t.includes("saída") || t.includes("saida")) type = "debit";
    }

    transactions.push({ date, description, amount: Math.abs(val), type });
  }
  return transactions;
}

export function parseCSVContent(content: string, separator?: string): ParsedTransaction[] {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const sep = separator || detectSeparator(lines[0]);
  const header = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const dateCol = findColumn(header, DATE_CANDIDATES);
  const descCol = findColumn(header, DESC_CANDIDATES);
  const amountCol = findColumn(header, AMOUNT_CANDIDATES);
  const creditCol = findColumn(header, CREDIT_CANDIDATES);
  const debitCol = findColumn(header, DEBIT_CANDIDATES);

  if (dateCol === -1 || descCol === -1) return parseCSVPositional(lines, sep);

  const transactions: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length <= Math.max(dateCol, descCol)) continue;

    const rawDate = clean(cols[dateCol]);
    const description = clean(cols[descCol]);
    if (!rawDate || !description) continue;

    const date = parseDataBR(rawDate);
    if (!date) continue;

    let amount = 0;
    let type: "credit" | "debit" = "debit";

    if (amountCol >= 0 && cols[amountCol]) {
      const val = parseMoneyBR(cols[amountCol]);
      amount = Math.abs(val);
      type = val >= 0 ? "credit" : "debit";
    } else if (creditCol >= 0 || debitCol >= 0) {
      const creditVal = creditCol >= 0 ? parseMoneyBR(cols[creditCol] || "0") : 0;
      const debitVal = debitCol >= 0 ? parseMoneyBR(cols[debitCol] || "0") : 0;
      if (creditVal > 0) { amount = creditVal; type = "credit"; }
      else if (debitVal > 0) { amount = debitVal; type = "debit"; }
      else continue;
    } else continue;

    if (amount === 0) continue;
    transactions.push({ date, description, amount, type });
  }

  console.log(`[csvParser] Parsed ${transactions.length} transactions`);
  return transactions;
}

function parseCSVPositional(lines: string[], sep: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length < 2) continue;

    let dateIdx = -1, dateVal = "";
    for (let c = 0; c < Math.min(cols.length, 3); c++) {
      const d = parseDataBR(clean(cols[c]));
      if (d) { dateIdx = c; dateVal = d; break; }
    }
    if (dateIdx < 0) continue;

    let amountIdx = -1, amountVal = 0;
    for (let c = cols.length - 1; c > dateIdx; c--) {
      const val = parseMoneyBR(cols[c]);
      if (val !== 0) { amountIdx = c; amountVal = val; break; }
    }
    if (amountIdx < 0) continue;

    const descParts: string[] = [];
    for (let c = dateIdx + 1; c < amountIdx; c++) {
      const v = clean(cols[c]);
      if (v) descParts.push(v);
    }

    transactions.push({
      date: dateVal,
      description: descParts.join(" ").trim() || "Sem descrição",
      amount: Math.abs(amountVal),
      type: amountVal >= 0 ? "credit" : "debit",
    });
  }
  return transactions;
}

// Helpers
const DATE_CANDIDATES = ["data", "date", "dt", "data lancamento", "data lançamento", "data mov", "data movimentação", "data movimentacao", "data transação", "data transacao"];
const DESC_CANDIDATES = ["descricao", "descrição", "historico", "histórico", "description", "memo", "lancamento", "lançamento", "detalhe", "detalhes", "nome", "estabelecimento", "favorecido"];
const AMOUNT_CANDIDATES = ["valor", "amount", "value", "vlr", "montante", "quantia", "total"];
const CREDIT_CANDIDATES = ["credito", "crédito", "credit", "entrada", "receita"];
const DEBIT_CANDIDATES = ["debito", "débito", "debit", "saida", "saída", "despesa"];

export function detectSeparator(headerLine: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0, "|": 0 };
  for (const ch of Object.keys(counts)) {
    counts[ch] = (headerLine.match(new RegExp(ch === "|" ? "\\|" : ch, "g")) || []).length;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.includes(c));
    if (idx >= 0) return idx;
  }
  return -1;
}

function clean(val: string): string {
  return val.trim().replace(/^"|"$/g, "").trim();
}

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

export function getCSVHeaders(content: string): { headers: string[]; sampleRows: string[][]; separator: string } {
  const lines = content.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length === 0) return { headers: [], sampleRows: [], separator: "," };
  const sep = detectSeparator(lines[0]);
  const headers = splitCSVLine(lines[0], sep).map(h => clean(h));
  const sampleRows = lines.slice(1, 6).map(l => splitCSVLine(l, sep).map(c => clean(c)));
  return { headers, sampleRows, separator: sep };
}
