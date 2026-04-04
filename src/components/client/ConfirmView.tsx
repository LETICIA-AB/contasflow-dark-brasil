import { useState } from "react";
import { CATEGORIES, type Client, type Transaction, loadClients, saveClients, persistClient } from "@/data/store";
import { resolveAccounts } from "@/data/chartOfAccounts";
import { recordClassification, classifyTransaction } from "@/data/classificationRules";
import { saveToMemory } from "@/data/memoryStore";
import { Textarea } from "@/components/ui/textarea";
import { Zap, CheckCircle2, PartyPopper, Upload, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Props {
  client: Client;
  onUpdate: () => void;
}

// Status tag config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  auto:        { label: "IA",       className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  memory:      { label: "IA",       className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  client:      { label: "Cliente",  className: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  accountant:  { label: "Contador", className: "bg-cf-green/15 text-cf-green border border-cf-green/30" },
  pending:     { label: "Pendente", className: "bg-cf-yellow/15 text-cf-yellow border border-cf-yellow/30" },
};

function StatusTag({ classifiedBy }: { classifiedBy: Transaction["classifiedBy"] }) {
  const cfg = STATUS_CONFIG[classifiedBy] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: "credit" | "debit" }) {
  if (type === "credit") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cf-green/15 text-cf-green border border-cf-green/30 whitespace-nowrap">
        <ArrowDownCircle className="w-3 h-3" /> Entrada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cf-red/15 text-cf-red border border-cf-red/30 whitespace-nowrap">
      <ArrowUpCircle className="w-3 h-3" /> Saída
    </span>
  );
}

export default function ConfirmView({ client, onUpdate }: Props) {
  const [, setTick] = useState(0);
  const [othersInput, setOthersInput] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});

  const allTxs = client.transactions;
  const pending = allTxs.filter((t) => t.classifiedBy === "pending");
  const byAI = allTxs.filter((t) => t.classifiedBy === "auto" || t.classifiedBy === "memory");
  const byClient = allTxs.filter((t) => t.classifiedBy === "client");
  const total = allTxs.length;
  const classified = total - pending.length;
  const progress = total > 0 ? Math.round((classified / total) * 100) : 100;

  const getSuggestion = (tx: Transaction): string | null => {
    const result = classifyTransaction(tx.description, tx.type);
    return result.auto ? result.category : null;
  };

  const handleClassify = (txId: string, category: string, clientDescription?: string) => {
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
    if (clientDescription) tx.clientDescription = clientDescription;
    recordClassification(tx.description, category, tx.type, c);
    saveToMemory(tx.description, category, accounts.debit, accounts.credit, c.id, clientDescription);
    const stillPending = c.transactions.filter((t) => t.classifiedBy === "pending");
    if (stillPending.length === 0) c.status = "review";
    saveClients(clients);
    persistClient(c).catch(() => {});
    onUpdate();
    setTick((t) => t + 1);
  };

  const handleCategorySelect = (txId: string, category: string) => {
    if (category === "Outros") {
      setSelectedCategory((prev) => ({ ...prev, [txId]: category }));
    } else {
      setSelectedCategory((prev) => { const n = { ...prev }; delete n[txId]; return n; });
      handleClassify(txId, category);
    }
  };

  const handleConfirmOthers = (txId: string) => {
    const desc = othersInput[txId]?.trim();
    if (!desc) return;
    handleClassify(txId, "Outros", desc);
    setSelectedCategory((prev) => { const n = { ...prev }; delete n[txId]; return n; });
    setOthersInput((prev) => { const n = { ...prev }; delete n[txId]; return n; });
  };

  const handleConfirmAll = () => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    let changed = false;
    for (const tx of c.transactions) {
      if (tx.classifiedBy !== "pending") continue;
      const suggestion = getSuggestion(tx);
      if (suggestion) {
        tx.category = suggestion;
        tx.classifiedBy = "client";
        const accounts = resolveAccounts(suggestion, tx.type, c.bank, c.chartOverrides);
        tx.debitAccount = accounts.debit;
        tx.creditAccount = accounts.credit;
        recordClassification(tx.description, suggestion, tx.type, c);
        saveToMemory(tx.description, suggestion, accounts.debit, accounts.credit, c.id);
        changed = true;
      }
    }
    if (changed) {
      const stillPending = c.transactions.filter((t) => t.classifiedBy === "pending");
      if (stillPending.length === 0) c.status = "review";
      saveClients(clients);
      persistClient(c).catch(() => {});
      onUpdate();
      setTick((t) => t + 1);
    }
  };

  const suggestedCount = pending.filter((tx) => getSuggestion(tx)).length;

  // Empty state
  if (total === 0) {
    return (
      <div className="space-y-6 cf-stagger">
        <div>
          <h2 className="text-2xl font-bold font-heading">Conferir Transações</h2>
          <p className="text-muted-foreground text-sm mt-1">Confirme as sugestões da IA ou classifique manualmente</p>
        </div>
        <div className="cf-card text-center py-16">
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-semibold">Nenhuma transação ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Envie um extrato na aba "Envios" para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 cf-stagger">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading">Conferir Transações</h2>
        <p className="text-muted-foreground text-sm mt-1">Confirme as sugestões da IA ou classifique manualmente</p>
      </div>

      {/* Summary bar */}
      <div className="cf-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Progress */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{classified} de {total} classificadas</span>
              <span className="text-xs font-bold text-primary tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Counters */}
          <div className="flex items-center gap-3 text-xs">
            {pending.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cf-yellow/15 text-cf-yellow border border-cf-yellow/30 font-semibold">
                {pending.length} pendentes
              </span>
            )}
            {byAI.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
                <Zap className="w-3 h-3" /> {byAI.length} pela IA
              </span>
            )}
            {byClient.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold">
                {byClient.length} pelo cliente
              </span>
            )}
          </div>

          {/* Confirm all */}
          {suggestedCount > 0 && (
            <button
              className="cf-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap"
              onClick={handleConfirmAll}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar {suggestedCount} sugestão(ões)
            </button>
          )}

          {/* All done */}
          {progress === 100 && (
            <span className="flex items-center gap-1.5 text-cf-green text-xs font-semibold">
              <PartyPopper className="w-4 h-4" /> Tudo conferido!
            </span>
          )}
        </div>
      </div>

      {/* Transactions table */}
      <div className="cf-card p-0 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[90px_1fr_110px_180px_90px] gap-0 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo</span>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição</span>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right pr-4">Valor</span>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Classificação</span>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {allTxs.map((tx) => {
            const suggestion = tx.classifiedBy === "pending" ? getSuggestion(tx) : null;
            const isPending = tx.classifiedBy === "pending";
            const showOthers = selectedCategory[tx.id] === "Outros";

            return (
              <div key={tx.id} className={isPending ? "bg-cf-yellow/[0.03]" : ""}>
                <div className="grid grid-cols-[90px_1fr_110px_180px_90px] gap-0 px-4 py-3 items-start">
                  {/* Tipo */}
                  <div className="pt-0.5">
                    <TypeBadge type={tx.type} />
                  </div>

                  {/* Descrição + data */}
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium truncate" title={tx.description}>{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{tx.date}</p>
                    {suggestion && !showOthers && (
                      <p className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          <Zap className="w-2.5 h-2.5" /> Sugestão: {suggestion}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="text-right pr-4 pt-0.5">
                    <span className={`text-sm font-semibold tabular-nums ${tx.type === "credit" ? "text-cf-green" : "text-cf-red"}`}>
                      {tx.type === "credit" ? "+" : "-"}&nbsp;R$&nbsp;{tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Classificação */}
                  <div className="min-w-0">
                    {isPending ? (
                      <div className="flex flex-col gap-1.5">
                        {suggestion && !showOthers && (
                          <button
                            className="cf-btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1 w-fit"
                            onClick={() => handleClassify(tx.id, suggestion)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Confirmar
                          </button>
                        )}
                        <select
                          className="cf-select text-xs py-1 px-2 h-7"
                          value={selectedCategory[tx.id] || ""}
                          onChange={(e) => handleCategorySelect(tx.id, e.target.value)}
                        >
                          <option value="" disabled>{suggestion ? "Outra categoria" : "Selecionar…"}</option>
                          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-foreground/80">{tx.category || "—"}</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center pt-0.5">
                    <StatusTag classifiedBy={tx.classifiedBy} />
                  </div>
                </div>

                {/* Inline textarea for "Outros" */}
                {showOthers && (
                  <div className="px-4 pb-3 grid grid-cols-[90px_1fr_110px_180px_90px] gap-0">
                    <div />
                    <div className="col-span-3 pr-4 space-y-2">
                      <Textarea
                        placeholder="Descreva o que foi essa movimentação..."
                        value={othersInput[tx.id] || ""}
                        onChange={(e) => setOthersInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                        className="text-sm min-h-[56px] bg-background"
                      />
                      <button
                        onClick={() => handleConfirmOthers(tx.id)}
                        disabled={!othersInput[tx.id]?.trim()}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
