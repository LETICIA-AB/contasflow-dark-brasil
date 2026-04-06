import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { extractPDFLines } from "./pdfExtractor";

import { bancoBrasilPdfParser } from "./bancoBrasilPdfParser";
import { itauPdfParser } from "./itauPdfParser";
import { santanderPdfParser } from "./santanderPdfParser";
import { interPdfParser } from "./interPdfParser";
import { sicoobPdfParser } from "./sicoobPdfParser";
import { stonePdfParser } from "./stonePdfParser";
import { cloudwalkPdfParser } from "./cloudwalkPdfParser";
import { genericPdfParser } from "./genericPdfParser";
import { ofxParser } from "./ofxParser";
import { csvGenericParser } from "./csvGenericParser";
import { xlsxParser } from "./xlsxParser";

const ALL_PARSERS: StatementParser[] = [
  bancoBrasilPdfParser,
  itauPdfParser,
  santanderPdfParser,
  interPdfParser,
  sicoobPdfParser,
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

export async function registryParse(
  file: File,
  textContent?: string,
  buffer?: ArrayBuffer
): Promise<RegistryResult> {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  const isPdf = ext === "pdf";
  const isXlsx = ext === "xlsx" || ext === "xls";

  const ctx: ParserContext = {
    fileName: file.name,
    mimeType: file.type || "",
    textContent,
    buffer,
  };

  if (isPdf && buffer) {
    ctx.textLines = await extractPDFLines(buffer);
  }

  const compatible = ALL_PARSERS.filter(p => {
    if (isPdf) return p.supportedFormats.includes("pdf");
    if (isXlsx) return p.supportedFormats.includes("xlsx") || p.supportedFormats.includes("xls");
    if (ext === "ofx") return p.supportedFormats.includes("ofx");
    if (ext === "csv" || ext === "txt") return p.supportedFormats.includes("csv") || p.supportedFormats.includes("txt");
    return true;
  });

  const scored = compatible
    .map(p => ({ parser: p, score: p.canParse(ctx) }))
    .sort((a, b) => b.score - a.score);

  console.log(
    `[registry] Scores para ${file.name}:`,
    scored.map(s => `${s.parser.id}=${s.score.toFixed(2)}`).join(", ")
  );

  const best = scored[0];

  if (!best || best.score < 0.1) {
    const sample = ctx.textLines?.slice(0, 200).join("\n") || ctx.textContent?.slice(0, 5000) || "";
    try {
      localStorage.setItem(
        `cf-unsupported-sample-${Date.now()}`,
        JSON.stringify({ fileName: file.name, sample, date: new Date().toISOString() })
      );
    } catch {}
    console.warn(`[registry] Nenhum parser compatível para ${file.name}`);
    return { transactions: [], parserId: "none", parserName: "Nenhum", unsupported: true, sampleText: sample.slice(0, 500) };
  }

  console.log(`[registry] Parser selecionado: ${best.parser.id} (score: ${best.score.toFixed(2)})`);
  const transactions = await best.parser.parse(ctx);

  return { transactions, parserId: best.parser.id, parserName: best.parser.name };
}
