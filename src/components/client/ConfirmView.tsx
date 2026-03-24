import { useState } from "react";
import { CATEGORIES, type Client, type Transaction, loadClients, saveClients } from "@/data/store";
import { resolveAccounts } from "@/data/chartOfAccounts";
import { recordClassification, classifyTransaction } from "@/data/classificationRules";

interface Props {
  client: Client;
  onUpdate: () => void;
}

export default function ConfirmView({ client, onUpdate }: Props) {
  const [, setTick] = useState(0);

  const pending = client.transactions.filter((t) => t.classifiedBy === "pending");
  const total = client.transactions.length;
  const classified = total - pending.length;
  const progress = total > 0 ? Math.round((classified / total) * 100) : 100;

  // Get AI/memory suggestions for pending transactions
  const getSuggestion = (tx: Transaction): string | null => {
    // Check if classification rules have a suggestion
    const { classifyTransaction } = require("@/data/classificationRules");
    const result = classifyTransaction(tx.description, tx.type);
    return result.auto ? result.category : null;
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
          <p className="text-cf-green text-sm mt-3 font-medium">✓ Todas classificadas! Conclua o envio na aba "Envios".</p>
        )}
      </div>

      {/* Confirm all button */}
      {suggestedCount > 0 && (
        <div className="cf-card border-primary/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">⚡ {suggestedCount} transações com sugestão da IA</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A IA identificou a categoria para essas transações. Confirme todas de uma vez ou revise individualmente.
            </p>
          </div>
          <button className="cf-btn-primary whitespace-nowrap" onClick={handleConfirmAll}>
            ✓ Confirmar todas as sugestões
          </button>
        </div>
      )}

      {/* Pending transactions */}
      {pending.length > 0 ? (
        <div className="cf-card border-cf-yellow/30 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-cf-yellow/5">
            <h3 className="font-semibold text-cf-yellow">⏳ {pending.length} transações pendentes</h3>
          </div>
          <div className="divide-y divide-border/50">
            {pendingWithSuggestions.map(({ tx, suggestion }) => (
              <div key={tx.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.date} · <span className={tx.type === "credit" ? "text-cf-green" : "text-cf-red"}>
                      {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                  {suggestion && (
                    <p className="text-xs mt-1">
                      <span className="cf-badge-accent">⚡ Sugestão: {suggestion}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {suggestion && (
                    <button
                      className="cf-btn-primary text-xs py-1.5 px-3"
                      onClick={() => handleClassify(tx.id, suggestion)}
                    >
                      ✓ Confirmar
                    </button>
                  )}
                  <select
                    className="cf-select max-w-[200px]"
                    defaultValue=""
                    onChange={(e) => handleClassify(tx.id, e.target.value)}
                  >
                    <option value="" disabled>{suggestion ? "Outra categoria" : "Selecionar categoria"}</option>
                    {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : total > 0 ? (
        <div className="cf-card text-center py-12">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-semibold">Tudo conferido!</p>
          <p className="text-sm text-muted-foreground mt-1">Todas as transações foram classificadas. Volte à aba "Envios" para concluir.</p>
        </div>
      ) : (
        <div className="cf-card text-center py-12">
          <p className="text-4xl mb-3">📤</p>
          <p className="text-lg font-semibold">Nenhuma transação ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Envie um extrato na aba "Envios" para começar.</p>
        </div>
      )}
    </div>
  );
}
