import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { extractPDFLines } from "./pdfExtractor";

// Import all parsers
import { stonePdfParser } from "./stonePdfParser";
import { cloudwalkPdfParser } from "./cloudwalkPdfParser";
import { genericPdfParser } from "./genericPdfParser";
import { ofxParser } from "./ofxParser";
import { csvGenericParser } from "./csvGenericParser";
import { xlsxParser } from "./xlsxParser";

const ALL_PARSERS: StatementParser[] = [
  stonePdfParser,
  cloudwalkPdfParser,
  genericPdfParser,
  ofxParser,
  csvGenericParser,
  xlsxParser,
];

export interface RegistryResult {
  transactions: ParsedTransaction[];
  parserId: string;
  parserName: string;
  unsupported?: boolean;
  sampleText?: string;
}

/**
 * Parse a file by selecting the best parser based on heuristic scores.
 */
export async function registryParse(file: File, textContent?: string, buffer?: ArrayBuffer): Promise<RegistryResult> {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  const isPdf = ext === "pdf";
  const isXlsx = ext === "xlsx" || ext === "xls";

  // Build context
  const ctx: ParserContext = {
    fileName: file.name,
    mimeType: file.type || "",
    textContent,
    buffer,
  };

  // For PDFs, extract text lines first
  if (isPdf && buffer) {
    ctx.textLines = await extractPDFLines(buffer);
  }

  // Score all parsers
  const scored = ALL_PARSERS
    .filter(p => {
      if (isPdf) return p.supportedFormats.includes("pdf");
      if (isXlsx) return p.supportedFormats.includes("xlsx") || p.supportedFormats.includes("xls");
      if (ext === "ofx") return p.supportedFormats.includes("ofx");
      if (ext === "csv" || ext === "txt") return p.supportedFormats.includes("csv") || p.supportedFormats.includes("txt");
      return true;
    })
    .map(p => ({ parser: p, score: p.canParse(ctx) }))
    .sort((a, b) => b.score - a.score);

  console.log(`[registry] Scores for ${file.name}:`, scored.map(s => `${s.parser.id}=${s.score.toFixed(2)}`).join(", "));

  const best = scored[0];

  if (!best || best.score < 0.1) {
    // Unsupported - save sample
    const sample = ctx.textLines?.slice(0, 200).join("\n") || ctx.textContent?.slice(0, 5000) || "";
    const key = `cf-unsupported-sample-${Date.now()}`;
    try { localStorage.setItem(key, JSON.stringify({ fileName: file.name, sample, date: new Date().toISOString() })); } catch {}
    console.warn(`[registry] No parser matched for ${file.name} (best score: ${best?.score ?? 0})`);
    return { transactions: [], parserId: "none", parserName: "Nenhum", unsupported: true, sampleText: sample.slice(0, 500) };
  }

  console.log(`[registry] Selected parser: ${best.parser.id} (score: ${best.score.toFixed(2)})`);
  const transactions = await best.parser.parse(ctx);

  return {
    transactions,
    parserId: best.parser.id,
    parserName: best.parser.name,
  };
}
