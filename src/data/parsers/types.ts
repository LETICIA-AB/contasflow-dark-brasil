import type { ParsedTransaction } from "../fileParser";

export interface ParserContext {
  fileName: string;
  mimeType: string;
  textContent?: string;
  buffer?: ArrayBuffer;
  textLines?: string[];
}

export interface ParserResult {
  transactions: ParsedTransaction[];
  parserId: string;
  parserName: string;
  needsMapping?: boolean;
  headers?: string[];
  sampleRows?: string[][];
  rawContent?: string;
}

export interface StatementParser {
  id: string;
  name: string;
  supportedFormats: string[];
  canParse(ctx: ParserContext): number;
  parse(ctx: ParserContext): Promise<ParsedTransaction[]>;
}
