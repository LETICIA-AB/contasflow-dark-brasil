// === OFX, CSV and PDF file parsers ===

export interface ParsedTransaction {
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;     // always positive
  type: "credit" | "debit";
}

/**
 * Parse OFX (Open Financial Exchange) bank statement files.
 * Extracts transactions from <STMTTRN> blocks.
 */
export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  // Split by STMTTRN blocks
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const endIdx = block.search(/<\/STMTTRN>/i);
    const txBlock = endIdx >= 0 ? block.substring(0, endIdx) : block;

    const getTag = (tag: string): string => {
      // OFX can be SGML (no closing tags) or XML
      const xmlMatch = txBlock.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
      if (xmlMatch) return xmlMatch[1].trim();
      const sgmlMatch = txBlock.match(new RegExp(`<${tag}>(.+)`, "im"));
      if (sgmlMatch) return sgmlMatch[1].trim().split("\n")[0].trim();
      return "";
    };

    const rawDate = getTag("DTPOSTED");
    const rawAmount = getTag("TRNAMT");
    const memo = getTag("MEMO") || getTag("NAME") || getTag("FITID");

    if (!rawDate || !rawAmount) continue;

    // Parse date: YYYYMMDD or YYYYMMDDHHMMSS
    const year = rawDate.substring(0, 4);
    const month = rawDate.substring(4, 6);
    const day = rawDate.substring(6, 8);
    const date = `${year}-${month}-${day}`;

    const amount = parseFloat(rawAmount.replace(",", "."));
    if (isNaN(amount)) continue;

    transactions.push({
      date,
      description: memo || "Sem descrição",
      amount: Math.abs(amount),
      type: amount >= 0 ? "credit" : "debit",
    });
  }

  return transactions;
}

/**
 * Parse CSV bank statement files.
 * Uses heuristics to detect date, description, and amount columns.
 */
export function parseCSV(content: string, separator?: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  const sep = separator || detectSeparator(lines[0]);
  const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  // Find columns by heuristic
  const dateCol = findColumn(header, ["data", "date", "dt", "data lancamento", "data lançamento", "data mov", "data movimentação"]);
  const descCol = findColumn(header, ["descricao", "descrição", "historico", "histórico", "description", "memo", "lancamento", "lançamento", "detalhe"]);
  const amountCol = findColumn(header, ["valor", "amount", "value", "vlr", "montante"]);
  const creditCol = findColumn(header, ["credito", "crédito", "credit", "entrada"]);
  const debitCol = findColumn(header, ["debito", "débito", "debit", "saida", "saída"]);

  if (dateCol === -1 || descCol === -1) return [];

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length <= Math.max(dateCol, descCol)) continue;

    const rawDate = clean(cols[dateCol]);
    const description = clean(cols[descCol]);
    if (!rawDate || !description) continue;

    const date = parseDate(rawDate);
    if (!date) continue;

    let amount = 0;
    let type: "credit" | "debit" = "debit";

    if (amountCol >= 0 && cols[amountCol]) {
      const val = parseAmount(cols[amountCol]);
      amount = Math.abs(val);
      type = val >= 0 ? "credit" : "debit";
    } else if (creditCol >= 0 || debitCol >= 0) {
      const creditVal = creditCol >= 0 ? parseAmount(cols[creditCol] || "0") : 0;
      const debitVal = debitCol >= 0 ? parseAmount(cols[debitCol] || "0") : 0;
      if (creditVal > 0) { amount = creditVal; type = "credit"; }
      else if (debitVal > 0) { amount = debitVal; type = "debit"; }
      else continue;
    } else continue;

    if (amount === 0) continue;

    transactions.push({ date, description, amount, type });
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

function parseAmount(raw: string): number {
  const cleaned = clean(raw)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")   // remove thousand separators
    .replace(",", ".");    // decimal comma → dot
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;
  return null;
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

/**
 * Parse a PDF bank statement using PDF.js loaded from CDN at runtime.
 * Extracts text content from all pages, groups items into visual lines,
 * then applies Brazilian bank statement heuristics to find transactions.
 *
 * Throws if PDF.js cannot be loaded (no network) — caller should catch and
 * show a user-facing error.
 */
export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore - dynamic CDN import for PDF.js
  const pdfjsLib = (await import(
    /* @vite-ignore */ "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"
  )) as any;

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group text items into visual rows by Y coordinate proximity (±3 units)
    const rows: Array<{ y: number; texts: { x: number; str: string }[] }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x: number = item.transform[4];
      const y: number = item.transform[5];
      const existing = rows.find((r) => Math.abs(r.y - y) <= 3);
      if (existing) {
        existing.texts.push({ x, str: item.str });
      } else {
        rows.push({ y, texts: [{ x, str: item.str }] });
      }
    }

    // Sort rows top-to-bottom (PDF Y=0 is bottom-left, so descending Y = top first)
    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      // Sort text items left-to-right within each line
      row.texts.sort((a, b) => a.x - b.x);
      const lineText = row.texts.map((t) => t.str).join(" ").trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return parsePDFLines(allLines);
}

/**
 * Parse text lines extracted from a PDF to find Brazilian bank statement
 * transactions. Handles Stone, Nubank, Itaú, Bradesco, Sicoob and others.
 */
function parsePDFLines(lines: string[]): ParsedTransaction[] {
  const DATE_RE = /(\d{2}\/\d{2}\/\d{4})/;
  const AMOUNT_RE = /([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

  // Keywords to infer type when no explicit +/- sign is present
  const CREDIT_KW = ["recebido", "recebida", "depósito", "deposito", "entrada", "crédito", "credito", "reembolso", "devolução", "devolucao", "rendimento", "cashback", "pix recebido", "ted recebida"];
  const DEBIT_KW  = ["pagamento", "enviado", "enviada", "saque", "débito", "debito", "taxa", "tarifa", "mensalidade", "cobrança", "cobranca", "pix enviado", "ted enviada", "transferência enviada"];

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const amountMatch = AMOUNT_RE.exec(line);
    if (!amountMatch) continue;

    // Parse date DD/MM/YYYY → YYYY-MM-DD
    const parts = dateMatch[1].split("/");
    const date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;

    // Parse amount — strip whitespace inside the match first
    const rawAmt = amountMatch[1].replace(/\s/g, "");
    const hasPlus  = rawAmt.startsWith("+");
    const hasMinus = rawAmt.startsWith("-");
    const absAmt = parseFloat(
      rawAmt.replace(/[+\-R$]/g, "").replace(/\./g, "").replace(",", ".")
    );
    if (isNaN(absAmt) || absAmt === 0) continue;

    // Description: text between end-of-date and start-of-amount
    const dateEnd  = dateMatch.index + dateMatch[0].length;
    const amtStart = line.indexOf(amountMatch[0], dateEnd);
    const rawDesc  = amtStart > dateEnd
      ? line.substring(dateEnd, amtStart)
      : line.substring(dateEnd);
    const description = rawDesc.trim().replace(/\s+/g, " ") || "Sem descrição";

    // Determine credit / debit
    let type: "credit" | "debit";
    if (hasPlus) {
      type = "credit";
    } else if (hasMinus) {
      type = "debit";
    } else {
      const lower = description.toLowerCase();
      if (CREDIT_KW.some((kw) => lower.includes(kw))) {
        type = "credit";
      } else if (DEBIT_KW.some((kw) => lower.includes(kw))) {
        type = "debit";
      } else {
        type = "debit"; // safe default
      }
    }

    transactions.push({ date, description, amount: absAmt, type });
  }

  return transactions;
}
