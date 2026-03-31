import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

export const ofxParser: StatementParser = {
  id: "ofx",
  name: "OFX (Open Financial Exchange)",
  supportedFormats: ["ofx"],

  canParse(ctx: ParserContext): number {
    const text = ctx.textContent || "";
    if (/<OFX/i.test(text) || /<STMTTRN>/i.test(text)) return 0.99;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const content = ctx.textContent || "";
    const transactions: ParsedTransaction[] = [];
    const normalized = content.replace(/\r\n?/g, "\n");
    const blocks = normalized.split(/<STMTTRN>/i).slice(1);

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
      if (["CREDIT", "DEP", "INT", "DIV"].includes(trnType)) txType = "credit";
      else if (["DEBIT", "CHECK", "FEE", "SRVCHG", "PAYMENT"].includes(trnType)) txType = "debit";
      else txType = amount >= 0 ? "credit" : "debit";

      transactions.push({ date, description: memo || "Sem descrição", amount: Math.abs(amount), type: txType });
    }

    console.log(`[ofxParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};
