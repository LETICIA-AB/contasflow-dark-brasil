import type { StatementParser, ParserContext } from "./types";
import type { ParsedTransaction } from "../fileParser";

const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03",
  abril: "04", maio: "05", junho: "06", julho: "07",
  agosto: "08", setembro: "09", outubro: "10",
  novembro: "11", dezembro: "12",
};

const DATA_EXTENSO = /(\d{1,2})\s+de\s+([a-záéíóúãõçA-Z]+)\s+de\s+(20\d{2})/i;
const DATA_NUMERICA = /^(\d{2}\/\d{2}\/\d{4})/;
const VALOR_RE = /(-?\s*R\$\s*[\d.]+,\d{2})/g;

export const interPdfParser: StatementParser = {
  id: "inter-pdf",
  name: "Banco Inter (PDF)",
  supportedFormats: ["pdf"],

  canParse(ctx: ParserContext): number {
    const text = (ctx.textLines || []).slice(0, 40).join("\n");
    if (/banco inter|inter\.co|bancointer/i.test(text)) return 0.95;
    if (DATA_EXTENSO.test(text)) return 0.7;
    return 0;
  },

  async parse(ctx: ParserContext): Promise<ParsedTransaction[]> {
    const lines = ctx.textLines || [];
    const transactions: ParsedTransaction[] = [];

    let currentDate: string | null = null;
    let descBuffer = "";

    const IGNORE_LINES = [
      "fale com a gente", "ouvidoria", "deficiência de fala",
      "sac:", "atendimento", "central de", "saldo do dia",
      "extrato", "período", "agência", "conta corrente",
    ];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const lower = line.toLowerCase();

      if (IGNORE_LINES.some(ig => lower.includes(ig))) continue;

      const dateExtMatch = DATA_EXTENSO.exec(line);
      if (dateExtMatch) {
        const dia = dateExtMatch[1].padStart(2, "0");
        const mesNome = dateExtMatch[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const mes = MESES[mesNome] || MESES[dateExtMatch[2].toLowerCase()] || "01";
        const ano = dateExtMatch[3];
        currentDate = `${ano}-${mes}-${dia}`;
        descBuffer = "";
        continue;
      }

      const dateNumMatch = DATA_NUMERICA.exec(line);
      if (dateNumMatch) {
        const parts = dateNumMatch[1].split("/");
        currentDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        descBuffer = "";
        continue;
      }

      if (!currentDate) continue;

      VALOR_RE.lastIndex = 0;
      const matches: Array<{ raw: string; value: number; isNeg: boolean }> = [];
      let vm: RegExpExecArray | null;
      while ((vm = VALOR_RE.exec(line)) !== null) {
        const rawVal = vm[1];
        const isNeg = /^-\s*/.test(rawVal.trim());
        const numStr = rawVal.replace(/[^\d,]/g, "").replace(",", ".");
        const value = parseFloat(numStr) || 0;
        if (value > 0) matches.push({ raw: rawVal, value, isNeg });
      }

      if (matches.length > 0) {
        let descLine = line;
        for (const mv of matches) descLine = descLine.replace(mv.raw, "");
        const fullDesc = ((descBuffer + " " + descLine).trim()).replace(/\s{2,}/g, " ");
        descBuffer = "";

        if (fullDesc.toLowerCase().includes("saldo")) continue;

        const mainVal = matches[0];
        transactions.push({
          date: currentDate,
          description: fullDesc || "Sem descrição",
          amount: mainVal.value,
          type: mainVal.isNeg ? "debit" : "credit",
        });
      } else {
        descBuffer += (descBuffer ? " " : "") + line;
      }
    }

    console.log(`[interPdfParser] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};
