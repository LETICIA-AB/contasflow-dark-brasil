import { describe, it, expect } from "vitest";
import { parseDataBR, parseMoneyBR, normalizeText } from "@/data/brHelpers";

describe("parseDataBR", () => {
  it("parses DD/MM/YYYY", () => {
    expect(parseDataBR("31/01/2026")).toBe("2026-01-31");
  });

  it("parses DD/MM/YY (2-digit year)", () => {
    expect(parseDataBR("31/01/26")).toBe("2026-01-31");
  });

  it("parses DD/MM/YY with year > 50 as 19xx", () => {
    expect(parseDataBR("15/06/99")).toBe("1999-06-15");
  });

  it("parses ISO format", () => {
    expect(parseDataBR("2026-01-31")).toBe("2026-01-31");
  });

  it("returns null for invalid input", () => {
    expect(parseDataBR("not-a-date")).toBeNull();
    expect(parseDataBR("")).toBeNull();
  });
});

describe("parseMoneyBR", () => {
  it("parses R$ 1.234,56", () => {
    expect(parseMoneyBR("R$ 1.234,56")).toBe(1234.56);
  });

  it("parses - R$ 0,30 (negative with space)", () => {
    expect(parseMoneyBR("- R$ 0,30")).toBe(-0.30);
  });

  it("parses +24,66", () => {
    expect(parseMoneyBR("+24,66")).toBe(24.66);
  });

  it("parses R$ 28.649,18", () => {
    expect(parseMoneyBR("R$ 28.649,18")).toBe(28649.18);
  });

  it("returns 0 for empty string", () => {
    expect(parseMoneyBR("")).toBe(0);
  });
});

describe("normalizeText", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeText("  hello   world  ")).toBe("hello world");
  });
});
