import { describe, it, expect } from "vitest";
import { parseCSVContent as parseCSV } from "@/data/parsers/csvGenericParser";

describe("parseCSV", () => {
  it("parses a semicolon-separated Brazilian CSV", () => {
    const csv = `Data;Descrição;Valor
15/01/2026;PIX REC CLIENTE;1500,00
16/01/2026;TARIFA BANCARIA;-89,90`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ date: "2026-01-15", description: "PIX REC CLIENTE", amount: 1500, type: "credit" });
    expect(result[1]).toMatchObject({ date: "2026-01-16", description: "TARIFA BANCARIA", amount: 89.90, type: "debit" });
  });

  it("parses CSV with DD/MM/YY dates", () => {
    const csv = `Data;Descrição;Valor
15/01/26;PIX REC;500,00`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-01-15");
  });
});

describe("OFX Parser", () => {
  it("parses a basic OFX SGML file", async () => {
    const { ofxParser } = await import("@/data/parsers/ofxParser");
    const ofx = `
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260115<TRNAMT>1500.00<MEMO>PIX REC CLIENTE</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260116<TRNAMT>-89.90<MEMO>TARIFA BANCARIA</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const result = await ofxParser.parse({ fileName: "test.ofx", mimeType: "", textContent: ofx });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ date: "2026-01-15", type: "credit", amount: 1500 });
    expect(result[1]).toMatchObject({ date: "2026-01-16", type: "debit", amount: 89.90 });
  });
});

describe("ParserRegistry", () => {
  it("scores OFX parser highest for OFX content", async () => {
    const { ofxParser } = await import("@/data/parsers/ofxParser");
    const score = ofxParser.canParse({ fileName: "test.ofx", mimeType: "", textContent: "<OFX><STMTTRN>" });
    expect(score).toBeGreaterThanOrEqual(0.99);
  });

  it("scores Stone parser for Stone PDF text", async () => {
    const { stonePdfParser } = await import("@/data/parsers/stonePdfParser");
    const score = stonePdfParser.canParse({
      fileName: "stone.pdf", mimeType: "", textLines: ["Stone Instituição de Pagamento", "DESCRIÇÃO VALOR SALDO"],
    });
    expect(score).toBeGreaterThanOrEqual(0.85);
  });
});
