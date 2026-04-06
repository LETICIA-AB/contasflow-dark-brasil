import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR } from "../brHelpers";

const CREDIT_KW = [
  "recebido", "recebida", "depósito", "deposito", "entrada", "crédito", "credito",
  "reembolso", "devolução", "devolucao", "rendimento", "cashback",
  "pix rec", "ted rec", "cred pix", "cred ted", "boleto rec",
  "booking", "ifood", "rappi", "cielo", "stone rec", "getnet",
];
const DEBIT_KW = [
  "pagamento", "enviado", "enviada", "saque", "débito", "debito",
  "taxa", "tarifa", "mensalidade", "cobrança", "cobranca",
  "pix env", "ted env", "transferência enviada", "pgto", "pagto",
];

export const genericPdfParser: StatementParser = {
  id: "generic-pdf",
  name: "PDF Genérico",
  supportedFormats: ["pdf"],

  canParse(): number {
    return 0.3;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];
    const DATE_RE = /(\d{2}\/\d{2}\/\d{2,4})/;

    for (const raw of lines) {
      const line = raw.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
      if (!line) continue;

      const dateMatch = DATE_RE.exec(line);
      if (!dateMatch) continue;

      const date = parseDataBR(dateMatch[1]);
      if (!date) continue;

      const lower = line.toLowerCase().replace(/\s/g, "");
      if (/saldo(anterior|final|dia|inicia)/.test(lower)) continue;

      // Strategy 1: suffix valor+C or valor+D (BB, Sicoob)
      const CD_RE = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])\b/g;
      const cdPairs: { value: number; cd: string }[] = [];
      let m: RegExpExecArray | null;
      CD_RE.lastIndex = 0;
      while ((m = CD_RE.exec(line)) !== null) {
        const val = parseBRNumber(m[1]);
        if (val > 0) cdPairs.push({ value: val, cd: m[2].toUpperCase() });
      }

      if (cdPairs.length > 0) {
        const chosen = cdPairs.find(p => p.cd === "C") || cdPairs.find(p => p.cd === "D") || cdPairs[0];
        const description = buildDescription(line, dateMatch[1]);
        if (description && chosen.value > 0) {
          transactions.push({ date, description, amount: chosen.value, type: chosen.cd === "C" ? "credit" : "debit" });
          continue;
        }
      }

      // Strategy 2: suffix valor- (Itaú style)
      const MINUS_RE = /(\d{1,3}(?:\.\d{3})*,\d{2})-(?!\d)/g;
      const minusPairs: number[] = [];
      MINUS_RE.lastIndex = 0;
      while ((m = MINUS_RE.exec(line)) !== null) {
        const val = parseBRNumber(m[1]);
        if (val > 0) minusPairs.push(val);
      }

      if (minusPairs.length > 0) {
        const description = buildDescription(line, dateMatch[1]);
        if (description) {
          transactions.push({ date, description, amount: minusPairs[0], type: "debit" });
          continue;
        }
      }

      // Strategy 3: prefix +/- before value
      const SIGNED_RE = /([+-])\s*R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/;
      const signedMatch = SIGNED_RE.exec(line);
      if (signedMatch) {
        const val = parseBRNumber(signedMatch[2]);
        if (val > 0) {
          const description = buildDescription(line, dateMatch[1]);
          if (description) {
            transactions.push({ date, description, amount: val, type: signedMatch[1] === "+" ? "credit" : "debit" });
            continue;
          }
        }
      }

      // Strategy 4: R$ with negative sign (Inter style)
      const RS_RE = /(-\s*)?R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/;
      const rsMatch = RS_RE.exec(line);
      if (rsMatch) {
        const val = parseBRNumber(rsMatch[2]);
        if (val > 0) {
          const isNeg = !!(rsMatch[1] && rsMatch[1].trim() === "-");
          const description = buildDescription(line, dateMatch[1]);
          if (description) {
            transactions.push({ date, description, amount: val, type: isNeg ? "debit" : "credit" });
            continue;
          }
        }
      }

      // Strategy 5: keyword inference (last resort)
      const PLAIN_RE = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
      const allVals: number[] = [];
      PLAIN_RE.lastIndex = 0;
      while ((m = PLAIN_RE.exec(line)) !== null) {
        const val = parseBRNumber(m[1]);
        if (val > 0) allVals.push(val);
      }

      if (allVals.length > 0) {
        const amount = allVals[0];
        const lowerLine = line.toLowerCase();
        let type: "credit" | "debit" = "debit";
        if (CREDIT_KW.some(kw => lowerLine.includes(kw))) type = "credit";

        const description = buildDescription(line, dateMatch[1]);
        if (description && amount > 0) {
          transactions.push({ date, description, amount, type });
        }
      }
    }

    console.log(`[genericPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

function parseBRNumber(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function buildDescription(line: string, dateStr: string): string {
  let desc = line;
  desc = desc.replace(new RegExp(escapeRegex(dateStr) + "\\s*"), "");
  desc = desc.replace(/^(?:\d+\s+){1,4}/, "");
  desc = desc.replace(/[+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*[-CD]?\b/g, "");
  return desc.replace(/\s{2,}/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
