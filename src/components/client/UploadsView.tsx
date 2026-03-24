import { useState, useRef } from "react";
import { CATEGORIES, type Client, type Transaction, type Upload, loadClients, saveClients, loadUploads, saveUploads } from "@/data/store";
import { recordClassification } from "@/data/classificationRules";
import { resolveAccounts } from "@/data/chartOfAccounts";

interface Props {
  client: Client;
  onUpdate: () => void;
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

export default function UploadsView({ client, onUpdate }: Props) {
  const [uploads, setUploads] = useState<Upload[]>(() => loadUploads().filter((u) => u.clientId === client.id));
  const [period, setPeriod] = useState("Mar/2026");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const periods = ["Out/2025", "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026"];
  const accepted = [".ofx", ".csv", ".txt", ".pdf"];

  const uploadedPeriods = new Set(uploads.map((u) => u.period));
  const missingMonths = MONTHS.filter(
    (m) => !uploadedPeriods.has(m.period) && periods.includes(m.period)
  );

  // Bank alerts
  const uploadedBanks = new Set(uploads.filter((u) => u.period === period).map((u) => u.bank));
  const missingBanks = (client.banks || []).filter((b) => {
    const shortName = b.split(" ")[0];
    return !uploadedBanks.has(b) && !uploadedBanks.has(shortName);
  });

  const pending = client.transactions.filter((t) => t.classifiedBy === "pending");
  const total = client.transactions.length;
  const classified = total - pending.length;
  const progress = total > 0 ? Math.round((classified / total) * 100) : 100;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setTimeout(() => {
      const allUploads = loadUploads();
      const newUploads: Upload[] = Array.from(files).map((f, i) => ({
        id: `up-${Date.now()}-${i}`,
        clientId: client.id,
        filename: f.name,
        bank: client.bank.split(" ")[0],
        size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
        date: new Date().toLocaleString("pt-BR"),
        period,
        status: "processado" as const,
      }));
      const updated = [...allUploads, ...newUploads];
      saveUploads(updated);
      setUploads(updated.filter((u) => u.clientId === client.id));
      setProcessing(false);
    }, 1500);
  };

  const handleClassify = (txId: string, category: string) => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    const tx = c.transactions.find((t) => t.id === txId);
    if (!tx) return;
    tx.category = category;
    tx.classifiedBy = "client";
    const accounts = resolveAccounts(category, tx.type, c.bank, c.chartOverrides);
    tx.debitAccount = accounts.debit;
    tx.creditAccount = accounts.credit;
    recordClassification(tx.description, category, tx.type, c);
    const stillPending = c.transactions.filter((t) => t.classifiedBy === "pending");
    if (stillPending.length === 0) c.status = "review";
    saveClients(clients);
    onUpdate();
    setTick((t) => t + 1);
  };

  const badgeFor = (t: Transaction) => {
    if (t.classifiedBy === "memory") return <span className="cf-badge-purple">🧠 Memória</span>;
    if (t.classifiedBy === "auto") return <span className="cf-badge-accent">⚡ IA</span>;
    if (t.classifiedBy === "client") return <span className="cf-badge-blue">👤 Cliente</span>;
    if (t.classifiedBy === "accountant") return <span className="cf-badge-purple">✍ Contador</span>;
    return <span className="cf-badge-yellow">⏳ Pendente</span>;
  };

  const statusBadge = (s: string) => {
    if (s === "processado") return <span className="cf-badge-green">✓ Processado</span>;
    if (s === "aguardando") return <span className="cf-badge-yellow">⏳ Aguardando</span>;
    return <span className="cf-badge-red">✗ Erro</span>;
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold font-heading">Extratos Bancários</h2>
        <p className="text-muted-foreground text-sm mt-1">Envie extratos, classifique transações e acompanhe seu progresso</p>
      </div>

      {/* 1. Annual Progress */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Progresso Anual — Extratos Enviados</h3>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {MONTHS.map((m) => {
            const hasUpload = uploadedPeriods.has(m.period);
            const isRequired = periods.includes(m.period);
            const isCurrent = m.period === CURRENT_MONTH_PERIOD;
            return (
              <div key={m.key} className="flex flex-col items-center gap-1.5 min-w-[3rem]">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    hasUpload
                      ? "bg-cf-green/20 text-cf-green border border-cf-green/40"
                      : isRequired
                        ? "bg-cf-red/10 text-cf-red border border-cf-red/30"
                        : "bg-secondary/40 text-muted-foreground border border-border"
                  } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  title={hasUpload ? `${m.period} — Enviado` : isRequired ? `${m.period} — Pendente` : m.period}
                >
                  {hasUpload ? "✓" : isRequired ? "!" : "—"}
                </div>
                <span className={`text-[10px] font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>{m.key}</span>
              </div>
            );
          })}
        </div>
        {missingMonths.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-cf-yellow/10 border border-cf-yellow/30 flex items-start gap-2">
            <span className="text-cf-yellow text-sm">⚠</span>
            <p className="text-cf-yellow text-xs font-medium">Extratos pendentes: {missingMonths.map((m) => m.period).join(", ")}</p>
          </div>
        )}
      </div>

      {/* 2. Upload compact */}
      <div className="cf-card">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Período</label>
            <select className="cf-select w-40" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div
            className={`flex-1 min-w-[250px] border-2 border-dashed rounded-lg transition-colors cursor-pointer flex items-center justify-center py-4 px-6 ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" className="hidden" accept={accepted.join(",")} multiple onChange={(e) => handleFiles(e.target.files)} />
            {processing ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Processando...</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">📁 Arraste ou clique · OFX, CSV, TXT, PDF</p>
            )}
          </div>
        </div>

        {/* Bank alerts */}
        {missingBanks.length > 0 && (
          <div className="px-3 py-2 rounded-lg bg-cf-yellow/10 border border-cf-yellow/30 text-xs">
            <p className="text-cf-yellow font-medium">⚠ Extratos pendentes ({period}): {missingBanks.join(", ")}</p>
          </div>
        )}
      </div>

      {/* 3. Classification */}
      <div className="cf-card">
        <h3 className="font-semibold mb-3">Classificação de Transações</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{classified} de {total} classificadas</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && <p className="text-cf-green text-sm mt-3 font-medium">✓ Todas classificadas! Aguardando revisão do contador.</p>}
      </div>

      {pending.length > 0 && (
        <div className="cf-card border-cf-yellow/30 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-cf-yellow/5">
            <h3 className="font-semibold text-cf-yellow">⚠ {pending.length} transações pendentes</h3>
          </div>
          <div className="divide-y divide-border/50">
            {pending.map((tx) => (
              <div key={tx.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.date} · {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <select className="cf-select max-w-[220px]" defaultValue="" onChange={(e) => handleClassify(tx.id, e.target.value)}>
                  <option value="" disabled>Selecionar categoria</option>
                  {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All transactions with debit/credit accounts */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Todas as transações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="cf-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {client.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="text-muted-foreground whitespace-nowrap">{tx.date}</td>
                  <td className="font-medium">{tx.description}</td>
                  <td className={tx.type === "credit" ? "text-cf-green" : "text-cf-red"}>
                    {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-sm">{tx.category || "—"}</td>
                  <td className="font-mono text-xs text-muted-foreground">{tx.debitAccount || "—"}</td>
                  <td className="font-mono text-xs text-muted-foreground">{tx.creditAccount || "—"}</td>
                  <td>{badgeFor(tx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Upload History */}
      {uploads.length > 0 && (
        <div className="cf-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Histórico de envios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Banco</th>
                  <th>Tamanho</th>
                  <th>Data/Hora</th>
                  <th>Período</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.filename}</td>
                    <td>{u.bank}</td>
                    <td className="text-muted-foreground">{u.size}</td>
                    <td className="text-muted-foreground">{u.date}</td>
                    <td>{u.period}</td>
                    <td>{statusBadge(u.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
