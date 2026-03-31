export interface PDFTextItem {
  x: number;
  y: number;
  str: string;
}

/**
 * Load PDF.js from CDN and extract text lines from a PDF buffer.
 */
export async function extractPDFLines(buffer: ArrayBuffer): Promise<string[]> {
  const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await (Function("url", "return import(url)")(cdnUrl));
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageItems: PDFTextItem[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      pageItems.push({
        x: item.transform[4],
        y: item.transform[5],
        str: item.str.trim(),
      });
    }

    const rows: Array<{ y: number; items: PDFTextItem[] }> = [];
    for (const item of pageItems) {
      const existing = rows.find((r) => Math.abs(r.y - item.y) <= 3);
      if (existing) existing.items.push(item);
      else rows.push({ y: item.y, items: [item] });
    }
    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const lineText = row.items.map((t) => t.str).join(" ").trim();
      if (lineText) allLines.push(lineText);
    }
  }

  console.log(`[pdfExtractor] Extracted ${allLines.length} lines from ${pdf.numPages} pages`);
  return allLines;
}
