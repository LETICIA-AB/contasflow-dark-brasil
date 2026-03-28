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

  // Some OFX files use \r\n or \r — normalize
  const normalized = content.replace(/\r\n?/g, "\n");

  // Split by STMTTRN blocks
  const blocks = normalized.split(/<STMTTRN>/i).slice(1);
  console.log(`[parseOFX] Found ${blocks.length} STMTTRN blocks`);

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
    const trnType = getTag("TRNTYPE").toUpperCase();
    const memo = getTag("MEMO") || getTag("NAME") || getTag("FITID");

    if (!rawDate || !rawAmount) {
      console.log(`[parseOFX] Skipping block: date=${rawDate}, amount=${rawAmount}`);
      continue;
    }

    // Parse date: YYYYMMDD or YYYYMMDDHHMMSS or YYYYMMDDHHMMSS[offset]
    const dateStr = rawDate.replace(/\[.*$/, ""); // remove timezone offset
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = `${year}-${month}-${day}`;

    const amount = parseFloat(rawAmount.replace(",", "."));
    if (isNaN(amount)) continue;

    // Determine type: prefer TRNTYPE tag, fallback to amount sign
    let txType: "credit" | "debit";
    if (trnType === "CREDIT" || trnType === "DEP" || trnType === "INT" || trnType === "DIV") {
      txType = "credit";
    } else if (trnType === "DEBIT" || trnType === "CHECK" || trnType === "FEE" || trnType === "SRVCHG" || trnType === "PAYMENT") {
      txType = "debit";
    } else {
      txType = amount >= 0 ? "credit" : "debit";
    }

    transactions.push({
      date,
      description: memo || "Sem descrição",
      amount: Math.abs(amount),
      type: txType,
    });
  }

  console.log(`[parseOFX] Parsed ${transactions.length} transactions`);
  return transactions;
}

/**
 * Parse CSV bank statement files.
 * Uses heuristics to detect date, description, and amount columns.
 * Supports Brazilian bank formats (Itaú, Bradesco, Nubank, Inter, Sicoob, etc.)
 */
export function parseCSV(content: string, separator?: string): ParsedTransaction[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    console.log("[parseCSV] Less than 2 lines, aborting");
    return [];
  }

  // Detect separator
  const sep = separator || detectSeparator(lines[0]);
  console.log(`[parseCSV] Detected separator: "${sep === "\t" ? "TAB" : sep}"`);

  const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  console.log("[parseCSV] Headers:", header);

  // Find columns by heuristic — expanded list for Brazilian banks
  const dateCol = findColumn(header, [
    "data", "date", "dt", "data lancamento", "data lançamento", "data mov",
    "data movimentação", "data movimentacao", "data transação", "data transacao",
    "data operação", "data operacao", "data do lançamento", "data do lancamento",
    "data da transação", "data da transacao", "data pagamento",
  ]);
  const descCol = findColumn(header, [
    "descricao", "descrição", "historico", "histórico", "description", "memo",
    "lancamento", "lançamento", "detalhe", "detalhes", "identificação",
    "identificacao", "titulo", "título", "informações", "informacoes",
    "nome", "estabelecimento", "favorecido",
  ]);
  const amountCol = findColumn(header, [
    "valor", "amount", "value", "vlr", "montante", "quantia", "total",
  ]);
  const creditCol = findColumn(header, [
    "credito", "crédito", "credit", "entrada", "receita",
  ]);
  const debitCol = findColumn(header, [
    "debito", "débito", "debit", "saida", "saída", "despesa",
  ]);

  console.log(`[parseCSV] Columns: date=${dateCol}, desc=${descCol}, amount=${amountCol}, credit=${creditCol}, debit=${debitCol}`);

  // If we can't find columns by header, try positional heuristic
  // Many Brazilian CSVs: Date;Description;Amount or Date;Description;Debit;Credit
  if (dateCol === -1 || descCol === -1) {
    console.log("[parseCSV] Header heuristic failed, trying positional parsing");
    return parseCSVPositional(lines, sep);
  }

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

  console.log(`[parseCSV] Parsed ${transactions.length} transactions`);
  return transactions;
}

/**
 * Positional CSV parser — tries to find date and amount in each row
 * without relying on headers. Works for many Brazilian bank exports.
 */
function parseCSVPositional(lines: string[], sep: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  // Skip first line (likely header)
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length < 2) continue;

    // Find the first column that looks like a date
    let dateIdx = -1;
    let dateVal = "";
    for (let c = 0; c < Math.min(cols.length, 3); c++) {
      const d = parseDate(clean(cols[c]));
      if (d) { dateIdx = c; dateVal = d; break; }
    }
    if (dateIdx < 0) continue;

    // Find amount — last numeric-looking column
    let amountIdx = -1;
    let amountVal = 0;
    for (let c = cols.length - 1; c > dateIdx; c--) {
      const val = parseAmount(cols[c]);
      if (val !== 0) { amountIdx = c; amountVal = val; break; }
    }
    if (amountIdx < 0) continue;

    // Description is everything between date and amount columns
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

  console.log(`[parseCSV positional] Parsed ${transactions.length} transactions`);
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
  let cleaned = clean(raw).replace(/[R$\s]/g, "");
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

  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;
  // YYYY/MM/DD
  const isoSlash = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (isoSlash) return `${isoSlash[1]}-${isoSlash[2]}-${isoSlash[3]}`;
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
 */
export async function parsePDF(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await (Function("url", "return import(url)")(cdnUrl));

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

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

    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.texts.sort((a, b) => a.x - b.x);
      const lineText = row.texts.map((t) => t.str).join(" ").trim();
      if (lineText) allLines.push(lineText);
    }
  }

  console.log(`[parsePDF] Extracted ${allLines.length} text lines from ${pdf.numPages} pages`);
  return parsePDFLines(allLines);
}

/**
 * Parse text lines extracted from a PDF to find Brazilian bank statement transactions.
 */
function parsePDFLines(lines: string[]): ParsedTransaction[] {
  const DATE_RE = /(\d{2}\/\d{2}\/\d{4})/;
  const AMOUNT_RE = /([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

  const CREDIT_KW = ["recebido", "recebida", "depósito", "deposito", "entrada", "crédito", "credito", "reembolso", "devolução", "devolucao", "rendimento", "cashback", "pix recebido", "ted recebida"];
  const DEBIT_KW  = ["pagamento", "enviado", "enviada", "saque", "débito", "debito", "taxa", "tarifa", "mensalidade", "cobrança", "cobranca", "pix enviado", "ted enviada", "transferência enviada"];

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const amountMatch = AMOUNT_RE.exec(line);
    if (!amountMatch) continue;

    const parts = dateMatch[1].split("/");
    const date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;

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
      if (CREDIT_KW.some((kw) => lower.includes(kw))) {
        type = "credit";
      } else if (DEBIT_KW.some((kw) => lower.includes(kw))) {
        type = "debit";
      } else {
        type = "debit";
      }
    }

    transactions.push({ date, description, amount: absAmt, type });
  }

  console.log(`[parsePDF] Parsed ${transactions.length} transactions from PDF lines`);
  return transactions;
}
