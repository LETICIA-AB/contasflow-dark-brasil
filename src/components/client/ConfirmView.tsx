import { useState } from "react";
import { CATEGORIES, type Client, type Transaction, loadClients, saveClients } from "@/data/store";
import { resolveAccounts } from "@/data/chartOfAccounts";
import { recordClassification, classifyTransaction } from "@/data/classificationRules";
import { saveToMemory } from "@/data/memoryStore";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Clock, CheckCircle2, PartyPopper, Upload } from "lucide-react";

interface Props {
  client: Client;
  onUpdate: () => void;
}

export default function ConfirmView({ client, onUpdate }: Props) {
  const [, setTick] = useState(0);
  const [othersInput, setOthersInput] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<Record<string, string>>({});

  const pending = client.transactions.filter((t) => t.classifiedBy === "pending");
  const total = client.transactions.length;
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
    // Persist to learning memory (including clientDescription for "Outros")
    saveToMemory(tx.description, category, accounts.debit, accounts.credit, c.id, clientDescription);

    const stillPending = c.transactions.filter((t) => t.classifiedBy === "pending");
    if (stillPending.length === 0) c.status = "review";

    saveClients(clients);
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
      onUpdate();
      setTick((t) => t + 1);
    }
  };

  const pendingWithSuggestions = pending.map((tx) => ({
    tx,
    suggestion: getSuggestion(tx),
  }));

  const suggestedCount = pendingWithSuggestions.filter((p) => p.suggestion).length;

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold font-heading">Conferir Transações</h2>
        <p className="text-muted-foreground text-sm mt-1">Confirme as sugestões da IA ou classifique manualmente</p>
      </div>

      {/* Progress */}
      <div className="cf-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{classified} de {total} classificadas</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {progress === 100 && (
          <div className="flex items-center gap-2 text-cf-green text-sm mt-3 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Todas classificadas! Conclua o envio na aba "Envios".
          </div>
        )}
      </div>

      {/* Confirm all button */}
      {suggestedCount > 0 && (
        <div className="cf-card border-primary/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="w-4 h-4 text-primary" />
              {suggestedCount} transações com sugestão da IA
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              A IA identificou a categoria para essas transações. Confirme todas de uma vez ou revise individualmente.
            </p>
          </div>
          <button className="cf-btn-primary whitespace-nowrap flex items-center gap-2" onClick={handleConfirmAll}>
            <CheckCircle2 className="w-4 h-4" />
            Confirmar todas as sugestões
          </button>
        </div>
      )}

      {/* Pending transactions */}
      {pending.length > 0 ? (
        <div className="cf-card border-cf-yellow/30 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-cf-yellow/5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cf-yellow" />
            <h3 className="font-semibold text-cf-yellow">{pending.length} transações pendentes</h3>
          </div>
          <div className="divide-y divide-border/50">
            {pendingWithSuggestions.map(({ tx, suggestion }) => (
              <div key={tx.id} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.date} · <span className={tx.type === "credit" ? "text-cf-green" : "text-cf-red"}>
                        {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                    {suggestion && (
                      <p className="text-xs mt-1">
                        <span className="cf-badge-accent inline-flex items-center gap-1"><Zap className="w-3 h-3" /> Sugestão: {suggestion}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {suggestion && !selectedCategory[tx.id] && (
                      <button
                        className="cf-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        onClick={() => handleClassify(tx.id, suggestion)}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Confirmar
                      </button>
                    )}
                    <select
                      className="cf-select max-w-[200px]"
                      value={selectedCategory[tx.id] || ""}
                      onChange={(e) => handleCategorySelect(tx.id, e.target.value)}
                    >
                      <option value="" disabled>{suggestion ? "Outra categoria" : "Selecionar categoria"}</option>
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
                {/* Campo de descrição para "Outros" */}
                {selectedCategory[tx.id] === "Outros" && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                    <Textarea
                      placeholder="Descreva o que foi essa movimentação..."
                      value={othersInput[tx.id] || ""}
                      onChange={(e) => setOthersInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                      className="text-sm min-h-[60px] bg-background"
                    />
                    <button
                      onClick={() => handleConfirmOthers(tx.id)}
                      disabled={!othersInput[tx.id]?.trim()}
                      className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirmar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : total > 0 ? (
        <div className="cf-card text-center py-12">
          <PartyPopper className="w-10 h-10 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">Tudo conferido!</p>
          <p className="text-sm text-muted-foreground mt-1">Todas as transações foram classificadas. Volte à aba "Envios" para concluir.</p>
        </div>
      ) : (
        <div className="cf-card text-center py-12">
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-semibold">Nenhuma transação ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Envie um extrato na aba "Envios" para começar.</p>
        </div>
      )}
    </div>
  );
}
