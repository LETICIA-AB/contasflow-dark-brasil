import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";
import { parseDataBR } from "../brHelpers";

const CREDIT_KW = ["recebido", "recebida", "depósito", "deposito", "entrada", "crédito", "credito", "reembolso", "devolução", "devolucao", "rendimento", "cashback", "pix recebido", "ted recebida"];
const DEBIT_KW = ["pagamento", "enviado", "enviada", "saque", "débito", "debito", "taxa", "tarifa", "mensalidade", "cobrança", "cobranca", "pix enviado", "ted enviada", "transferência enviada"];

export const genericPdfParser: StatementParser = {
  id: "generic-pdf",
  name: "PDF Genérico",
  supportedFormats: ["pdf"],

  canParse(): number {
    return 0.3; // fallback
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const DATE_RE = /(\d{2}\/\d{2}\/\d{2,4})/;
    const AMOUNT_RE = /([+-]?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;
    const transactions: ParsedTransaction[] = [];

    for (const line of lines) {
      const dateMatch = DATE_RE.exec(line);
      if (!dateMatch) continue;
      const amountMatch = AMOUNT_RE.exec(line);
      if (!amountMatch) continue;

      const date = parseDataBR(dateMatch[1]);
      if (!date) continue;

      const rawAmt = amountMatch[1].replace(/\s/g, "");
      const hasPlus = rawAmt.startsWith("+");
      const hasMinus = rawAmt.startsWith("-");
      const absAmt = parseFloat(rawAmt.replace(/[+\-R$]/g, "").replace(/\./g, "").replace(",", "."));
      if (isNaN(absAmt) || absAmt === 0) continue;

      const dateEnd = dateMatch.index + dateMatch[0].length;
      const amtStart = line.indexOf(amountMatch[0], dateEnd);
      const rawDesc = amtStart > dateEnd ? line.substring(dateEnd, amtStart) : line.substring(dateEnd);
      const description = rawDesc.trim().replace(/\s+/g, " ") || "Sem descrição";

      let type: "credit" | "debit";
      if (hasPlus) type = "credit";
      else if (hasMinus) type = "debit";
      else {
        const lower = description.toLowerCase();
        if (CREDIT_KW.some((kw) => lower.includes(kw))) type = "credit";
        else if (DEBIT_KW.some((kw) => lower.includes(kw))) type = "debit";
        else type = "debit";
      }

      transactions.push({ date, description, amount: absAmt, type });
    }

    console.log(`[genericPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};
