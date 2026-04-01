import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseCSVContent } from "./csvGenericParser";

export const xlsxParser: StatementParser = {
  id: "xlsx",
  name: "Planilha Excel (XLSX/XLS)",
  supportedFormats: ["xlsx", "xls"],

  canParse(ctx: ParserContext): number {
    const ext = ctx.fileName.toLowerCase().split(".").pop() || "";
    if (ext === "xlsx" || ext === "xls") return 0.99;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    if (!ctx.buffer) return [];

    const XLSX = await import("xlsx");
    const workbook = XLSX.read(ctx.buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const csvContent = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });

    console.log(`[xlsxParser] Converted sheet "${sheetName}" to CSV (${csvContent.length} chars)`);
    return parseCSVContent(csvContent, ";");
  },
};

export async function getXlsxHeaders(buffer: ArrayBuffer): Promise<{ headers: string[]; sampleRows: string[][]; sheetNames: string[] }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], sampleRows: [], sheetNames: [] };

  const sheet = workbook.Sheets[sheetName];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

  return {
    headers: (rows[0] || []).map(h => String(h || "").trim()),
    sampleRows: rows.slice(1, 6).map(r => r.map(c => String(c || "").trim())),
    sheetNames: workbook.SheetNames,
  };
}
