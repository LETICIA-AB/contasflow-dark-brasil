// === OFX, CSV and PDF file parsers ===
import { parseDataBR, parseMoneyBR, normalizeText } from "./brHelpers";

export interface ParsedTransaction {
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;     // always positive
  type: "credit" | "debit";
}

/**
 * Parse OFX (Open Financial Exchange) bank statement files.
 */
export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const normalized = content.replace(/\r\n?/g, "\n");
  const blocks = normalized.split(/<STMTTRN>/i).slice(1);
  console.log(`[parseOFX] Found ${blocks.length} STMTTRN blocks`);

  for (const block of blocks) {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const txBlock = endIdx >= 0 ? block.substring(0, endIdx) : block;

    const getTag = (tag: string): string => {
      const xmlMatch = txBlock.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
      if (xmlMatch) return xmlMatch[1].trim();
      const sgmlMatch = txBlock.match(new RegExp(`<${tag}>(.+)`, "im"));
      if (sgmlMatch) return sgmlMatch[1].trim().split("\n")[0].trim();
      return "";
    };

    const rawDate = getTag("DTPOSTED");
    const rawAmount = getTag("TRNAMT");
    const trnType = getTag("TRNTYPE").toUpperCase();
    const memo = getTag("MEMO") || getTag("NAME") || getTag("FITID");

    if (!rawDate || !rawAmount) continue;

    const dateStr = rawDate.replace(/\[.*$/, "");
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = `${year}-${month}-${day}`;

    const amount = parseFloat(rawAmount.replace(",", "."));
    if (isNaN(amount)) continue;

    let txType: "credit" | "debit";
    if (trnType === "CREDIT" || trnType === "DEP" || trnType === "INT" || trnType === "DIV") {
      txType = "credit";
    } else if (trnType === "DEBIT" || trnType === "CHECK" || trnType === "FEE" || trnType === "SRVCHG" || trnType === "PAYMENT") {
      txType = "debit";
    } else {
      txType = amount >= 0 ? "credit" : "debit";
    }

    transactions.push({ date, description: memo || "Sem descrição", amount: Math.abs(amount), type: txType });
  }

  console.log(`[parseOFX] Parsed ${transactions.length} transactions`);
  return transactions;
}

/**
 * Parse CSV bank statement files.
 */
export function parseCSV(content: string, separator?: string): ParsedTransaction[] {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = separator || detectSeparator(lines[0]);
  const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const dateCol = findColumn(header, ["data", "date", "dt", "data lancamento", "data lançamento", "data mov", "data movimentação", "data movimentacao", "data transação", "data transacao"]);
  const descCol = findColumn(header, ["descricao", "descrição", "historico", "histórico", "description", "memo", "lancamento", "lançamento", "detalhe", "detalhes", "nome", "estabelecimento", "favorecido"]);
  const amountCol = findColumn(header, ["valor", "amount", "value", "vlr", "montante", "quantia", "total"]);
  const creditCol = findColumn(header, ["credito", "crédito", "credit", "entrada", "receita"]);
  const debitCol = findColumn(header, ["debito", "débito", "debit", "saida", "saída", "despesa"]);

  if (dateCol === -1 || descCol === -1) {
    return parseCSVPositional(lines, sep);
  }

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

  console.log(`[parseCSV] Parsed ${transactions.length} transactions`);
  return transactions;
}

function parseCSVPositional(lines: string[], sep: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length < 2) continue;

    let dateIdx = -1;
    let dateVal = "";
    for (let c = 0; c < Math.min(cols.length, 3); c++) {
      const d = parseDataBR(clean(cols[c]));
      if (d) { dateIdx = c; dateVal = d; break; }
    }
    if (dateIdx < 0) continue;

    let amountIdx = -1;
    let amountVal = 0;
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
    const description = descParts.join(" ").trim() || "Sem descrição";

    transactions.push({
      date: dateVal,
      description,
      amount: Math.abs(amountVal),
      type: amountVal >= 0 ? "credit" : "debit",
    });
  }
  return transactions;
}

// === Helpers ===

function detectSeparator(headerLine: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0, "|": 0 };
  for (const ch of Object.keys(counts)) {
    counts[ch] = (headerLine.match(new RegExp(ch === "|" ? "\\|" : ch, "g")) || []).length;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.includes(c));
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

// === PDF parser ===

interface PDFTextItem {
  x: number;
  y: number;
  str: string;
}

/**
 * Parse a PDF bank statement using PDF.js loaded from CDN at runtime.
 * Detects Stone format and uses column-aware extraction.
 */
export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await (Function("url", "return import(url)")(cdnUrl));
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Collect ALL text items with positions across all pages
  const allItems: PDFTextItem[] = [];
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageItems: PDFTextItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      pageItems.push({
        x: item.transform[4],
        y: item.transform[5],
        str: item.str.trim(),
      });
    }

    // Group by Y for line reconstruction
    const rows: Array<{ y: number; items: PDFTextItem[] }> = [];
    for (const item of pageItems) {
      const existing = rows.find((r) => Math.abs(r.y - item.y) <= 3);
      if (existing) {
        existing.items.push(item);
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }
    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const lineText = row.items.map((t) => t.str).join(" ").trim();
      if (lineText) allLines.push(lineText);
    }

    allItems.push(...pageItems);
  }

  console.log(`[parsePDF] Extracted ${allLines.length} text lines from ${pdf.numPages} pages`);

  // Detect format
  const joinedText = allLines.slice(0, 30).join("\n");

  if (/stone\s+institui/i.test(joinedText) || /DESCRI[ÇC][ÃA]O.*VALOR.*SALDO/i.test(joinedText)) {
    console.log("[parsePDF] Detected Stone format → using column-aware parser");
    return parseStonePDFLines(allLines);
  }

  if (/infinitepay|cloudwalk/i.test(joinedText) || /tipo\s+de\s+transa/i.test(joinedText)) {
    console.log("[parsePDF] Detected InfinitePay format");
    return parseInfinitePayLines(allLines);
  }

  // Fallback: generic PDF parser
  return parsePDFLinesGeneric(allLines);
}

/**
 * Stone-specific PDF parser.
 * Stone PDFs have a table: DATA | TIPO | DESCRIÇÃO | VALOR | SALDO | CONTRAPARTE
 * Each line from PDF.js joins these columns with spaces.
 */
function parseStonePDFLines(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const DATE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+/;

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const date = parseDataBR(dateStr);
    if (!date) continue;

    const rest = line.substring(dateMatch[0].length);

    // Detect TIPO: "Entrada" or "Saída"
    const tipoMatch = rest.match(/^(Entrada|Sa[ií]da)\s+/i);
    if (!tipoMatch) continue;

    const tipo = tipoMatch[1].toLowerCase();
    const isDebit = tipo.startsWith("sa");
    const afterTipo = rest.substring(tipoMatch[0].length);

    // Find ALL monetary values in the remaining text
    // Pattern: optional "- ", optional "R$ ", then digits with BR format
    const moneyParts: { value: number; index: number; length: number }[] = [];
    const moneyRe = /(-\s*)?R?\$?\s*([\d]+(?:\.[\d]{3})*,\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = moneyRe.exec(afterTipo)) !== null) {
      const isNeg = !!(m[1] && m[1].trim() === "-");
      const val = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
      if (!isNaN(val)) {
        moneyParts.push({ value: isNeg ? -val : val, index: m.index, length: m[0].length });
      }
    }

    if (moneyParts.length === 0) continue;

    // Description = text before first monetary value
    const descEnd = moneyParts[0].index;
    let description = normalizeText(afterTipo.substring(0, descEnd));

    // Contraparte = text after last monetary value
    const lastMoney = moneyParts[moneyParts.length - 1];
    const afterLastMoney = afterTipo.substring(lastMoney.index + lastMoney.length).trim();
    // Clean up contraparte (remove Stone institution details)
    let contraparte = afterLastMoney
      .replace(/STONE\s+INSTITUI[ÇC][ÃA]O.*$/i, "")
      .replace(/Ag:\s*\d+.*$/i, "")
      .trim();

    // Build full description
    const parts: string[] = [];
    if (description) parts.push(description);
    if (contraparte) parts.push(contraparte);
    const fullDescription = parts.join(" | ") || tipo;

    const amount = Math.abs(moneyParts[0].value);
    if (amount === 0) continue;

    transactions.push({
      date,
      description: fullDescription,
      amount,
      type: isDebit ? "debit" : "credit",
    });
  }

  console.log(`[parsePDF Stone] Parsed ${transactions.length} transactions`);
  if (transactions.length > 0) {
    console.log(`[parsePDF Stone] Sample: ${transactions[0].description} → ${transactions[0].amount} (${transactions[0].type})`);
  }
  return transactions;
}

/**
 * InfinitePay/Cloudwalk PDF parser.
 * Columns: Data, Hora, Tipo de transação, Nome, Detalhe, Valor
 */
function parseInfinitePayLines(lines: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const DATE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+/;

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const date = parseDataBR(dateMatch[1]);
    if (!date) continue;

    const rest = line.substring(dateMatch[0].length);

    // Skip time if present
    const afterTime = rest.replace(/^\d{2}:\d{2}(:\d{2})?\s+/, "");

    // Find monetary value
    const moneyMatch = afterTime.match(/([+-]?\s*R?\$?\s*[\d]+(?:\.[\d]{3})*,\d{2})/);
    if (!moneyMatch) continue;

    const amount = parseMoneyBR(moneyMatch[1]);
    if (amount === 0) continue;

    // Description is everything before the value
    const descPart = afterTime.substring(0, afterTime.indexOf(moneyMatch[0])).trim();
    // Split into tipo, nome, detalhe by multiple spaces or specific patterns
    const description = normalizeText(descPart) || "Sem descrição";

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount >= 0 ? "credit" : "debit",
    });
  }

  console.log(`[parsePDF InfinitePay] Parsed ${transactions.length} transactions`);
  return transactions;
}

/**
 * Generic PDF line parser — fallback for unknown formats.
 */
function parsePDFLinesGeneric(lines: string[]): ParsedTransaction[] {
  const DATE_RE = /(\d{2}\/\d{2}\/\d{2,4})/;
  const AMOUNT_RE = /([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

  const CREDIT_KW = ["recebido", "recebida", "depósito", "deposito", "entrada", "crédito", "credito", "reembolso", "devolução", "devolucao", "rendimento", "cashback", "pix recebido", "ted recebida"];
  const DEBIT_KW  = ["pagamento", "enviado", "enviada", "saque", "débito", "debito", "taxa", "tarifa", "mensalidade", "cobrança", "cobranca", "pix enviado", "ted enviada", "transferência enviada"];

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const amountMatch = AMOUNT_RE.exec(line);
    if (!amountMatch) continue;

    const date = parseDataBR(dateMatch[1]);
    if (!date) continue;

    const rawAmt = amountMatch[1].replace(/\s/g, "");
    const hasPlus  = rawAmt.startsWith("+");
    const hasMinus = rawAmt.startsWith("-");
    const absAmt = parseFloat(
      rawAmt.replace(/[+\-R$]/g, "").replace(/\./g, "").replace(",", ".")
    );
    if (isNaN(absAmt) || absAmt === 0) continue;

    const dateEnd  = dateMatch.index + dateMatch[0].length;
    const amtStart = line.indexOf(amountMatch[0], dateEnd);
    const rawDesc  = amtStart > dateEnd
      ? line.substring(dateEnd, amtStart)
      : line.substring(dateEnd);
    const description = rawDesc.trim().replace(/\s+/g, " ") || "Sem descrição";

    let type: "credit" | "debit";
    if (hasPlus) {
      type = "credit";
    } else if (hasMinus) {
      type = "debit";
    } else {
      const lower = description.toLowerCase();
      if (CREDIT_KW.some((kw) => lower.includes(kw))) type = "credit";
      else if (DEBIT_KW.some((kw) => lower.includes(kw))) type = "debit";
      else type = "debit";
    }

    transactions.push({ date, description, amount: absAmt, type });
  }

  console.log(`[parsePDF generic] Parsed ${transactions.length} transactions`);
  return transactions;
}
