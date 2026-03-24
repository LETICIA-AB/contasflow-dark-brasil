import { useState } from "react";
import { CATEGORIES, type Client, type Transaction, loadClients, saveClients } from "@/data/store";

interface Props {
  client: Client;
  onUpdate: () => void;
}

export default function ClassifyView({ client, onUpdate }: Props) {
  const [, setTick] = useState(0);

  const pending = client.transactions.filter((t) => t.classifiedBy === "pending");
  const total = client.transactions.length;
  const classified = total - pending.length;
  const progress = total > 0 ? Math.round((classified / total) * 100) : 100;

  const handleClassify = (txId: string, category: string) => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    const tx = c.transactions.find((t) => t.id === txId);
    if (!tx) return;
    tx.category = category;
    tx.classifiedBy = "client";

    // Check if all classified
    const stillPending = c.transactions.filter((t) => t.classifiedBy === "pending");
    if (stillPending.length === 0) {
      c.status = "review";
    }

    saveClients(clients);
    onUpdate();
    setTick((t) => t + 1);
  };

  const badgeFor = (t: Transaction) => {
    if (t.classifiedBy === "auto") return <span className="cf-badge-accent">⚡ IA</span>;
    if (t.classifiedBy === "client") return <span className="cf-badge-blue">👤 Cliente</span>;
    if (t.classifiedBy === "accountant") return <span className="cf-badge-purple">✍ Contador</span>;
    return <span className="cf-badge-yellow">⏳ Pendente</span>;
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold">Classificar Transações</h2>
        <p className="text-muted-foreground text-sm mt-1">Identifique as transações pendentes</p>
      </div>

      {/* Progress */}
      <div className="cf-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">{classified} de {total} classificadas</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-cf-green text-sm mt-3 font-medium">
            ✓ Todas classificadas! Aguardando revisão do contador.
          </p>
        )}
      </div>

      {/* Pending first */}
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
                <select
                  className="cf-select max-w-[220px]"
                  defaultValue=""
                  onChange={(e) => handleClassify(tx.id, e.target.value)}
                >
                  <option value="" disabled>Selecionar categoria</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All transactions */}
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
                  <td>{badgeFor(tx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
