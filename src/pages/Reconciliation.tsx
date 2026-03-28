import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Trash2, Download, Building2, ClipboardPaste,
  CheckCircle2, Clock, BarChart3, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────

interface BankInfo {
  name: string;
  document: string;
  institution: string;
  agency: string;
  account: string;
  period: string;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  balance: number;
  counterpart: string;
  reconciled: boolean;
}

// ── PDF Parser (uses PDF.js from CDN) ──────────────────────────────────

async function parseStoneExtract(buffer: ArrayBuffer): Promise<{ info: BankInfo; transactions: Transaction[] }> {
  const cdnUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await (Function("url", "return import(url)")(cdnUrl));
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const rows: Array<{ y: number; texts: { x: number; str: string }[] }> = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of textContent.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x: number = item.transform[4];
      const y: number = item.transform[5];
      const existing = rows.find((r) => Math.abs(r.y - y) <= 3);
      if (existing) existing.texts.push({ x, str: item.str });
      else rows.push({ y, texts: [{ x, str: item.str }] });
    }

    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      row.texts.sort((a, b) => a.x - b.x);
      allLines.push(row.texts.map((t) => t.str).join(" ").trim());
    }
  }

  console.log("[Stone PDF] Extracted lines:", allLines.length);
  allLines.forEach((l, i) => console.log(`  [${i}] ${l}`));

  return extractStoneData(allLines);
}

function extractStoneData(lines: string[]): { info: BankInfo; transactions: Transaction[] } {
  const info: BankInfo = {
    name: "",
    document: "",
    institution: "Stone Instituição de Pagamento S.A.",
    agency: "",
    account: "",
    period: "",
  };

  const transactions: Transaction[] = [];
  const fullText = lines.join("\n");

  // Extract bank info with flexible patterns
  const nameMatch = fullText.match(/(?:Nome|Titular|Conta)[:\s]*([A-ZÀ-Ú][A-Za-zÀ-ú\s.&'-]{2,})/i);
  if (nameMatch) info.name = nameMatch[1].trim();

  const docMatch = fullText.match(/(?:Documento|CPF|CNPJ|CPF\/CNPJ)[:\s]*([\d.\/-]+)/i);
  if (docMatch) info.document = docMatch[1].trim();

  const agMatch = fullText.match(/(?:Agência|Ag)[:\s.]*([\d-]+)/i);
  if (agMatch) info.agency = agMatch[1].trim();

  const accMatch = fullText.match(/(?:Conta)[:\s.]*([\d.\/-]+)/i);
  if (accMatch) info.account = accMatch[1].trim();

  const periodMatch = fullText.match(/(?:Período|Periodo)[:\s]*(\d{2}\/\d{2}\/\d{4})\s*(?:a|até|-)\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) info.period = `${periodMatch[1]} a ${periodMatch[2]}`;

  // Parse transaction lines — look for lines starting with date DD/MM/YYYY
  const DATE_RE = /^(\d{2}\/\d{2}\/\d{4})/;
  const AMOUNT_RE = /(-?\s*R?\$?\s*[\d.]+,\d{2})/g;

  for (const line of lines) {
    const dateMatch = DATE_RE.exec(line);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const rest = line.substring(dateMatch[0].length).trim();

    // Find all amounts in the line
    const amounts: number[] = [];
    let m;
    const amountRe = /(-?\s*R?\$?\s*[\d.]+,\d{2})/g;
    while ((m = amountRe.exec(rest)) !== null) {
      let raw = m[1].replace(/\s/g, "").replace(/R\$/g, "");
      const isNeg = raw.startsWith("-");
      raw = raw.replace(/^[+-]/, "");
      const val = parseFloat(raw.replace(/\./g, "").replace(",", "."));
      if (!isNaN(val)) amounts.push(isNeg ? -val : val);
    }

    if (amounts.length < 1) continue;

    // Remove amounts from text to get description parts
    const textPart = rest.replace(/(-?\s*R?\$?\s*[\d.]+,\d{2})/g, "|||").trim();
    const parts = textPart.split("|||").map(s => s.trim()).filter(Boolean);

    // Heuristic: first text part = type, rest = description + counterpart
    const type = parts[0] || "Outros";
    const description = parts.length > 1 ? parts[1] : parts[0] || "";
    const counterpart = parts.length > 2 ? parts.slice(2).join(" ") : "";

    const amount = amounts[0];
    const balance = amounts.length > 1 ? amounts[1] : 0;

    transactions.push({
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      type,
      description: description || type,
      amount,
      balance,
      counterpart,
      reconciled: false,
    });
  }

  console.log("[Stone PDF] Info:", info);
  console.log("[Stone PDF] Transactions:", transactions.length);
  return { info, transactions };
}

// ── Manual text parser ─────────────────────────────────────────────────

function parseManualText(text: string): Transaction[] {
  const lines = text.split("\n").filter(l => l.trim());
  const transactions: Transaction[] = [];

  for (const line of lines) {
    // Try pipe-separated: 01/01/2026 | Tipo | Desc | 5.000,00 | 15.000,00 | Contraparte
    const pipeParts = line.split("|").map(s => s.trim());
    if (pipeParts.length >= 4 && /\d{2}\/\d{2}\/\d{4}/.test(pipeParts[0])) {
      const amount = parseManualAmount(pipeParts[3]);
      const balance = pipeParts.length > 4 ? parseManualAmount(pipeParts[4]) : 0;
      transactions.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: pipeParts[0],
        type: pipeParts[1] || "Outros",
        description: pipeParts[2] || "",
        amount,
        balance,
        counterpart: pipeParts.length > 5 ? pipeParts[5] : "",
        reconciled: false,
      });
      continue;
    }

    // Try tab-separated
    const tabParts = line.split("\t").map(s => s.trim());
    if (tabParts.length >= 4 && /\d{2}\/\d{2}\/\d{4}/.test(tabParts[0])) {
      const amount = parseManualAmount(tabParts[3]);
      const balance = tabParts.length > 4 ? parseManualAmount(tabParts[4]) : 0;
      transactions.push({
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: tabParts[0],
        type: tabParts[1] || "Outros",
        description: tabParts[2] || "",
        amount,
        balance,
        counterpart: tabParts.length > 5 ? tabParts[5] : "",
        reconciled: false,
      });
    }
  }

  return transactions;
}

function parseManualAmount(raw: string): number {
  let cleaned = raw.trim().replace(/[R$\s]/g, "");
  const isNegative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/^[+-]/, "");
  // Handle Brazilian format: 1.500,00 → 1500.00
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, "");
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  const val = parseFloat(cleaned) || 0;
  return isNegative ? -val : val;
}

// ── Export to text file ────────────────────────────────────────────────

function exportReconciliation(info: BankInfo, transactions: Transaction[], signerName: string) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR");

  const reconciled = transactions.filter(t => t.reconciled).length;
  const pending = transactions.length - reconciled;
  const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  let content = `RELATÓRIO DE CONCILIAÇÃO BANCÁRIA\n`;
  content += `${"═".repeat(60)}\n\n`;
  content += `Data da Conciliação: ${dateStr} às ${timeStr}\n\n`;

  content += `INFORMAÇÕES DO BANCO\n`;
  content += `${"─".repeat(40)}\n`;
  content += `Nome: ${info.name || "N/A"}\n`;
  content += `Documento: ${info.document || "N/A"}\n`;
  content += `Instituição: ${info.institution}\n`;
  content += `Agência: ${info.agency || "N/A"}\n`;
  content += `Conta: ${info.account || "N/A"}\n`;
  content += `Período: ${info.period || "N/A"}\n\n`;

  content += `RESUMO\n`;
  content += `${"─".repeat(40)}\n`;
  content += `Total de lançamentos: ${transactions.length}\n`;
  content += `Conciliados: ${reconciled}\n`;
  content += `Pendentes: ${pending}\n`;
  content += `Saldo final: R$ ${finalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n`;

  content += `LANÇAMENTOS\n`;
  content += `${"─".repeat(100)}\n`;
  content += `Status | Data       | Tipo           | Descrição                    | Valor          | Saldo          | Contraparte\n`;
  content += `${"─".repeat(100)}\n`;

  for (const tx of transactions) {
    const status = tx.reconciled ? "  ✓  " : "  ○  ";
    const val = tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const bal = tx.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    content += `${status} | ${tx.date} | ${tx.type.padEnd(14)} | ${tx.description.padEnd(28).slice(0, 28)} | ${val.padStart(14)} | ${bal.padStart(14)} | ${tx.counterpart}\n`;
  }

  content += `\n${"─".repeat(60)}\n`;
  content += `Assinatura: ${signerName || "___________________________"}\n`;
  content += `Data: ${dateStr}\n`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conciliacao_stone_${now.toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────

export default function Reconciliation() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [signerName, setSignerName] = useState("");

  // Summary
  const summary = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter(t => t.reconciled).length;
    const pending = total - reconciled;
    const finalBalance = total > 0 ? transactions[total - 1].balance : 0;
    return { total, reconciled, pending, finalBalance };
  }, [transactions]);

  // Handle PDF upload
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const { info, transactions: txs } = await parseStoneExtract(buffer);

      if (txs.length === 0) {
        setError("Não foi possível extrair transações do PDF. Use a opção de colar dados manualmente.");
        setShowManual(true);
        setLoading(false);
        return;
      }

      setBankInfo(info);
      setTransactions(txs);
      setShowManual(false);
    } catch (err) {
      console.error("[Stone PDF] Error:", err);
      setError("Erro ao ler o PDF. Tente colar os dados manualmente.");
      setShowManual(true);
    }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Handle manual paste
  const handleManualSubmit = () => {
    const txs = parseManualText(manualText);
    if (txs.length === 0) {
      setError("Nenhuma transação encontrada no texto. Use o formato: Data | Tipo | Descrição | Valor | Saldo | Contraparte");
      return;
    }
    setBankInfo({
      name: "",
      document: "",
      institution: "Stone Instituição de Pagamento S.A.",
      agency: "",
      account: "",
      period: "",
    });
    setTransactions(txs);
    setError(null);
    setShowManual(false);
  };

  // Toggle reconciled
  const toggleReconciled = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, reconciled: !t.reconciled } : t));
  };

  // Clear all
  const clearSelection = () => {
    setTransactions(prev => prev.map(t => ({ ...t, reconciled: false })));
  };

  // Reset everything
  const resetAll = () => {
    setBankInfo(null);
    setTransactions([]);
    setError(null);
    setShowManual(false);
    setManualText("");
    setSignerName("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00a868] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Conciliação Bancária</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Stone Instituição de Pagamento</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Upload Area (shown when no data) */}
        {transactions.length === 0 && (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="py-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Envie o extrato Stone em PDF</p>
                <p className="text-xs text-muted-foreground">Ou cole os dados manualmente abaixo</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => fileRef.current?.click()} disabled={loading}>
                  <FileText className="w-4 h-4 mr-2" />
                  {loading ? "Lendo PDF..." : "Selecionar PDF"}
                </Button>
                <Button variant="outline" onClick={() => setShowManual(!showManual)}>
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Colar Dados
                </Button>
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>
              )}

              {showManual && (
                <div className="w-full max-w-2xl space-y-3 mt-2">
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder={"Cole os dados aqui (separados por | ou TAB):\n01/01/2026 | Transferência | Entrada cliente X | 5.000,00 | 15.000,00 | Cliente X"}
                    className="min-h-[160px] font-mono text-xs"
                  />
                  <Button onClick={handleManualSubmit} className="w-full">Processar Dados</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data loaded */}
        {transactions.length > 0 && (
          <>
            {/* Section 1: Bank Info */}
            {bankInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Informações do Banco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <InfoRow label="Nome" value={bankInfo.name} />
                    <InfoRow label="Documento" value={bankInfo.document} />
                    <InfoRow label="Instituição" value={bankInfo.institution} />
                    <InfoRow label="Agência" value={bankInfo.agency} />
                    <InfoRow label="Conta" value={bankInfo.account} />
                    <InfoRow label="Período" value={bankInfo.period} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 2: Transactions Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Lançamentos
                    <Badge variant="secondary" className="ml-1 text-xs">{transactions.length}</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Limpar Seleção
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetAll}>
                      Novo Extrato
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-3 py-2.5 text-left w-10">✓</th>
                        <th className="px-3 py-2.5 text-left">Data</th>
                        <th className="px-3 py-2.5 text-left">Tipo</th>
                        <th className="px-3 py-2.5 text-left">Descrição</th>
                        <th className="px-3 py-2.5 text-right">Valor</th>
                        <th className="px-3 py-2.5 text-right">Saldo</th>
                        <th className="px-3 py-2.5 text-left">Contraparte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr
                          key={tx.id}
                          className={`border-b border-border/40 transition-colors cursor-pointer hover:bg-secondary/20 ${
                            tx.reconciled ? "bg-primary/5" : idx % 2 === 0 ? "bg-transparent" : "bg-secondary/10"
                          }`}
                          onClick={() => toggleReconciled(tx.id)}
                        >
                          <td className="px-3 py-2.5">
                            <Checkbox
                              checked={tx.reconciled}
                              onCheckedChange={() => toggleReconciled(tx.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">{tx.date}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap">{tx.type}</td>
                          <td className="px-3 py-2.5 max-w-[200px] truncate">{tx.description}</td>
                          <td className={`px-3 py-2.5 text-right font-mono whitespace-nowrap font-medium ${
                            tx.amount >= 0 ? "text-[hsl(var(--cf-green))]" : "text-[hsl(var(--cf-red))]"
                          }`}>
                            {tx.amount < 0 ? "-" : ""}R$ {Math.abs(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-muted-foreground text-xs">
                            R$ {tx.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2.5 max-w-[150px] truncate text-muted-foreground">{tx.counterpart}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="Total de Lançamentos"
                value={summary.total.toString()}
              />
              <SummaryCard
                icon={<CheckCircle2 className="w-4 h-4 text-[hsl(var(--cf-green))]" />}
                label="Conciliados"
                value={summary.reconciled.toString()}
                accent="green"
              />
              <SummaryCard
                icon={<Clock className="w-4 h-4 text-[hsl(var(--cf-yellow))]" />}
                label="Pendentes"
                value={summary.pending.toString()}
                accent="yellow"
              />
              <SummaryCard
                icon={<BarChart3 className="w-4 h-4 text-[hsl(var(--cf-blue))]" />}
                label="Saldo Final"
                value={`R$ ${summary.finalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                accent="blue"
              />
            </div>

            {/* Export section */}
            <Card>
              <CardContent className="py-5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Assinatura (nome do responsável)
                    </label>
                    <Input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Digite o nome para assinatura..."
                    />
                  </div>
                  <Button
                    onClick={() => bankInfo && exportReconciliation(bankInfo, transactions, signerName)}
                    className="bg-[#00a868] hover:bg-[#008f59] text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Conciliação
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium truncate">{value || "N/A"}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-xl font-bold ${
          accent === "green" ? "text-[hsl(var(--cf-green))]" :
          accent === "yellow" ? "text-[hsl(var(--cf-yellow))]" :
          accent === "blue" ? "text-[hsl(var(--cf-blue))]" :
          "text-foreground"
        }`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
