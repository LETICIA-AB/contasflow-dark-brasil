import React, { useState, useRef } from "react";
import { type Client, type Transaction, type Upload, loadClients, saveClients, loadUploads, saveUploads } from "@/data/store";
import { addNotification } from "@/data/notificationStore";
import { classifyTransaction } from "@/data/classificationRules";
import { resolveAccounts } from "@/data/chartOfAccounts";
import { findInMemory } from "@/data/memoryStore";
import { parseOFX, parseCSV, parsePDF } from "@/data/fileParser";
import { CheckCircle2, AlertTriangle, Lock, FolderUp, Clock, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  client: Client;
  onUpdate: () => void;
  onNavigate?: (view: string) => void;
}

const MONTHS = [
  { key: "Out", period: "Out/2025" },
  { key: "Nov", period: "Nov/2025" },
  { key: "Dez", period: "Dez/2025" },
  { key: "Jan", period: "Jan/2026" },
  { key: "Fev", period: "Fev/2026" },
  { key: "Mar", period: "Mar/2026" },
  { key: "Abr", period: "Abr/2026" },
  { key: "Mai", period: "Mai/2026" },
  { key: "Jun", period: "Jun/2026" },
  { key: "Jul", period: "Jul/2026" },
  { key: "Ago", period: "Ago/2026" },
  { key: "Set", period: "Set/2026" },
];

const CURRENT_MONTH_PERIOD = "Mar/2026";

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Fev: "02", Mar: "03", Abr: "04", Mai: "05", Jun: "06",
  Jul: "07", Ago: "08", Set: "09", Out: "10", Nov: "11", Dez: "12",
};

export default function UploadsView({ client, onUpdate, onNavigate }: Props) {
  const [uploads, setUploads] = useState<Upload[]>(() => loadUploads().filter((u) => u.clientId === client.id));
  const [period, setPeriod] = useState("Mar/2026");
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const periods = ["Out/2025", "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026"];
  const accepted = [".ofx", ".csv", ".txt", ".pdf"];

  const uploadedPeriods = new Set(uploads.map((u) => u.period));
  const missingMonths = MONTHS.filter(
    (m) => !uploadedPeriods.has(m.period) && periods.includes(m.period)
  );

  const uploadedBanks = new Set(uploads.filter((u) => u.period === period).map((u) => u.bank));
  const missingBanks = (client.banks || []).filter((b) => {
    const shortName = b.split(" ")[0];
    return !uploadedBanks.has(b) && !uploadedBanks.has(shortName);
  });

  const pending = client.transactions.filter((t) => t.classifiedBy === "pending");
  const total = client.transactions.length;
  const classified = total - pending.length;
  const progress = total > 0 ? Math.round((classified / total) * 100) : 100;
  const canSubmit = pending.length === 0 && total > 0;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setParseError(null);

    const fileArray = Array.from(files);

    // PDFs must be read as ArrayBuffer for PDF.js; all others as text
    const readers: Promise<{ file: File; content: string; buffer?: ArrayBuffer }>[] = fileArray.map(
      (f) => {
        const ext = f.name.toLowerCase().split(".").pop() || "";
        return new Promise((resolve) => {
          const reader = new FileReader();
          if (ext === "pdf") {
            reader.onload = () => resolve({ file: f, content: "", buffer: reader.result as ArrayBuffer });
            reader.onerror = () => resolve({ file: f, content: "" });
            reader.readAsArrayBuffer(f);
          } else {
            reader.onload = () => resolve({ file: f, content: reader.result as string });
            reader.onerror = () => resolve({ file: f, content: "" });
            reader.readAsText(f);
          }
        });
      }
    );

    Promise.all(readers).then(async (results) => {
      const allUploads = loadUploads();
      const newUploads: Upload[] = results.map(({ file }, i) => ({
        id: `up-${Date.now()}-${i}`,
        clientId: client.id,
        filename: file.name,
        bank: client.bank.split(" ")[0],
        size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`,
        date: new Date().toLocaleString("pt-BR"),
        period,
        status: "processado" as const,
      }));
      const updated = [...allUploads, ...newUploads];
      saveUploads(updated);
      setUploads(updated.filter((u) => u.clientId === client.id));

      let allParsed: import("@/data/fileParser").ParsedTransaction[] = [];
      let pdfError = false;

      for (const { file, content, buffer } of results) {
        const ext = file.name.toLowerCase().split(".").pop() || "";
        if (ext === "pdf") {
          if (!buffer) continue;
          try {
            const parsed = await parsePDF(buffer);
            allParsed = [...allParsed, ...parsed];
          } catch {
            pdfError = true;
          }
        } else {
          if (!content) continue;
          if (ext === "ofx") {
            allParsed = [...allParsed, ...parseOFX(content)];
          } else if (ext === "csv" || ext === "txt") {
            allParsed = [...allParsed, ...parseCSV(content)];
          }
        }
      }

      const allClients = loadClients();
      const c = allClients.find((cl) => cl.id === client.id);
      if (c) {
        if (allParsed.length > 0) {
          const newTxs: Transaction[] = allParsed.map((p, i) => {
            // 1. Check memory first
            const mem = findInMemory(p.description, client.id);
            if (mem) {
              return {
                id: `${client.id}-t${Date.now()}-${i}`,
                date: p.date,
                description: p.description,
                amount: p.amount,
                type: p.type,
                category: mem.category,
                classifiedBy: "memory" as const,
                debitAccount: mem.debitAccount,
                creditAccount: mem.creditAccount,
                clientDescription: mem.clientDescription,
                approved: false,
              };
            }
            // 2. Check regex rules
            const result = classifyTransaction(p.description, p.type);
            const category = result.auto ? result.category : "";
            let debitAccount = "";
            let creditAccount = "";
            if (result.auto) {
              const accounts = resolveAccounts(result.category, p.type, client.bank);
              debitAccount = accounts.debit;
              creditAccount = accounts.credit;
            }
            return {
              id: `${client.id}-t${Date.now()}-${i}`,
              date: p.date,
              description: p.description,
              amount: p.amount,
              type: p.type,
              category,
              classifiedBy: result.auto ? "auto" as const : "pending" as const,
              ruleId: result.auto ? result.ruleId : undefined,
              debitAccount,
              creditAccount,
              approved: false,
            };
          });
          c.transactions = [...c.transactions, ...newTxs];
        } else if (pdfError) {
          setParseError("Não foi possível ler o PDF (sem conexão com CDN). Alternativa: no app Stone vá em Extrato → ⋮ → Exportar → CSV.");
        } else {
          setParseError("Nenhuma transação encontrada. Verifique se o formato é OFX ou CSV bancário válido.");
        }
        saveClients(allClients);
        onUpdate();
      }

      setProcessing(false);
    });
  };

  const handleSubmit = () => {
    const allClients = loadClients();
    const c = allClients.find((cl) => cl.id === client.id);
    if (c) {
      c.status = "review";
      saveClients(allClients);
      addNotification({
        type: "submission",
        clientId: client.id,
        clientName: client.name,
        message: `Concluiu o envio do período ${period}. ${total} transações classificadas e prontas para revisão.`,
      });
      onUpdate();
      setSubmitted(true);
      if (onNavigate) setTimeout(() => onNavigate("dashboard"), 1800);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "processado") return <span className="cf-badge-green inline-flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Processado</span>;
    if (s === "aguardando") return <span className="cf-badge-yellow inline-flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" /> Aguardando</span>;
    return <span className="cf-badge-red shrink-0">Erro</span>;
  };

  return (
    <div className="space-y-5 cf-stagger">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading">Envios</h2>
        <p className="text-muted-foreground text-sm mt-1">Envie extratos bancários e acompanhe o progresso</p>
      </div>

      {/* Zona 1: Upload + Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">

        {/* Upload zone */}
        <div className="cf-card space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Período</span>
            <select className="cf-select w-36" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center py-10 gap-3 ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" accept={accepted.join(",")} multiple onChange={(e) => handleFiles(e.target.files)} />
            {processing ? (
              <>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Analisando extrato...</span>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <FolderUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Arraste ou clique para enviar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">OFX · CSV · TXT · PDF</p>
                </div>
              </>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="px-3 py-2.5 rounded-lg bg-cf-red/10 border border-cf-red/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cf-red shrink-0 mt-0.5" />
              <div>
                <p className="text-cf-red text-xs font-medium">{parseError}</p>
                <p className="text-cf-red/60 text-[11px] mt-0.5">Formatos: OFX (extrato bancário) e CSV com data, descrição e valor.</p>
              </div>
            </div>
          )}

          {/* Inline success banner */}
          {!parseError && !processing && total > 0 && pending.length > 0 && onNavigate && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-cf-green/10 border border-cf-green/25">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-cf-green shrink-0" />
                <p className="text-xs text-cf-green font-medium truncate">
                  {total} importadas · {pending.length} aguardando classificação
                </p>
              </div>
              <button
                className="cf-btn-primary text-xs py-1.5 px-3 whitespace-nowrap shrink-0"
                onClick={() => onNavigate("confirm")}
              >
                Conferir →
              </button>
            </div>
          )}
        </div>

        {/* Compact calendar */}
        <div className="cf-card">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cobertura do ano</p>
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {MONTHS.map((m) => {
              const hasUpload = uploadedPeriods.has(m.period);
              const isRequired = periods.includes(m.period);
              const isCurrent = m.period === CURRENT_MONTH_PERIOD;
              return (
                <div key={m.key} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    hasUpload
                      ? "bg-cf-green/20 text-cf-green border border-cf-green/40"
                      : isCurrent
                        ? "bg-primary/15 text-primary border border-primary/50 ring-1 ring-primary/40 ring-offset-1 ring-offset-card"
                        : isRequired
                          ? "bg-cf-red/10 text-cf-red border border-cf-red/30"
                          : "bg-secondary/40 text-muted-foreground/40 border border-border/40"
                  }`}>
                    {hasUpload ? "✓" : m.key.slice(0, 3)}
                  </div>
                  <span className={`text-[9px] font-medium leading-none ${
                    isCurrent ? "text-primary" : hasUpload ? "text-cf-green/70" : "text-muted-foreground/50"
                  }`}>
                    {m.key}
                  </span>
                </div>
              );
            })}
          </div>

          {(missingBanks.length > 0 || missingMonths.length > 0) && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              {missingBanks.length > 0 && (
                <p className="text-[11px] text-cf-yellow/80 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Banco pendente: {missingBanks.join(", ")}
                </p>
              )}
              {missingMonths.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {missingMonths.length} mês(es) sem extrato
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zona 2: Progress + action */}
      <div className="cf-card">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {total === 0 ? "Nenhuma transação importada" : `${classified} de ${total} transações classificadas`}
              </span>
              {total > 0 && (
                <span className="text-sm font-bold text-primary tabular-nums">{progress}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${total === 0 ? 0 : progress}%` }}
              />
            </div>
          </div>

          <div className="shrink-0">
            {submitted ? (
              <div className="flex items-center gap-1.5 text-cf-green text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Enviado!
              </div>
            ) : canSubmit ? (
              <button className="cf-btn-primary flex items-center gap-2 whitespace-nowrap" onClick={handleSubmit}>
                <CheckCircle2 className="w-4 h-4" />
                Concluir envio
              </button>
            ) : (
              <button className="cf-btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2 whitespace-nowrap" disabled>
                <Lock className="w-4 h-4" />
                Concluir envio
              </button>
            )}
          </div>
        </div>

        {submitted && (
          <p className="text-xs text-muted-foreground mt-2">Aguardando revisão do contador.</p>
        )}
        {!submitted && !canSubmit && total > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <AlertTriangle className="w-3 h-3 inline text-cf-yellow mr-1" />
            Classifique as {pending.length} transação(ões) pendente(s) em <strong>Conferir</strong> para concluir.
          </p>
        )}
      </div>

      {/* Zona 3: Histórico simplificado */}
      {uploads.length > 0 && (
        <div className="cf-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm">Histórico de envios</h3>
          </div>
          <div className="divide-y divide-border/60">
            {uploads.map((u) => {
              const isExpanded = expandedUploadId === u.id;
              const [mk, yr] = u.period.split("/");
              const prefix = `${yr}-${MONTH_MAP[mk] ?? ""}`;
              const periodTxs = client.transactions.filter((t) => prefix && t.date.startsWith(prefix));
              const credits = periodTxs.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
              const debits = periodTxs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
              const classifiedCount = periodTxs.filter((t) => t.classifiedBy !== "pending").length;
              const pendingCount = periodTxs.length - classifiedCount;

              return (
                <div key={u.id}>
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedUploadId(isExpanded ? null : u.id)}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.filename}</p>
                      <p className="text-[11px] text-muted-foreground">{u.date}</p>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block">{u.period}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{u.bank}</span>
                    {periodTxs.length > 0 && (
                      <span className="text-xs text-muted-foreground">{periodTxs.length} tx</span>
                    )}
                    {statusBadge(u.status)}
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 bg-muted/20 border-t border-border/40">
                      {periodTxs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma transação para este período.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="rounded-lg bg-cf-green/10 border border-cf-green/20 px-3 py-2">
                              <p className="text-[10px] text-muted-foreground mb-0.5">Entradas</p>
                              <p className="text-sm font-semibold text-cf-green">
                                R$ {credits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="rounded-lg bg-cf-red/10 border border-cf-red/20 px-3 py-2">
                              <p className="text-[10px] text-muted-foreground mb-0.5">Saídas</p>
                              <p className="text-sm font-semibold text-cf-red">
                                R$ {debits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="rounded-lg bg-secondary/60 border border-border px-3 py-2">
                              <p className="text-[10px] text-muted-foreground mb-0.5">Classificadas</p>
                              <p className="text-sm font-semibold">{classifiedCount}/{periodTxs.length}</p>
                            </div>
                          </div>
                          {pendingCount > 0 && onNavigate && (
                            <button
                              className="cf-btn-secondary text-xs py-1.5"
                              onClick={(e) => { e.stopPropagation(); onNavigate("confirm"); }}
                            >
                              Ver transações pendentes →
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
