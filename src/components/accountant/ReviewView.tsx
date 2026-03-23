import { useState } from "react";
import { CATEGORIES, type Client, loadClients, saveClients } from "@/data/store";

interface Props {
  client: Client;
  onUpdate: () => void;
  onExport: (clientId: string) => void;
}

export default function ReviewView({ client, onUpdate, onExport }: Props) {
  const [, setTick] = useState(0);

  const txs = client.transactions;
  const auto = txs.filter((t) => t.classifiedBy === "auto").length;
  const byClient = txs.filter((t) => t.classifiedBy === "client").length;
  const byAccountant = txs.filter((t) => t.classifiedBy === "accountant").length;
  const pending = txs.filter((t) => t.classifiedBy === "pending").length;
  const approvedCount = txs.filter((t) => t.approved).length;

  const handleClassify = (txId: string, category: string) => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    const tx = c.transactions.find((t) => t.id === txId);
    if (!tx) return;
    tx.category = category;
    tx.classifiedBy = "accountant";
    saveClients(clients);
    onUpdate();
    setTick((t) => t + 1);
  };

  const handleApproveAll = () => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    c.transactions.forEach((t) => { t.approved = true; });
    c.status = "approved";
    saveClients(clients);
    onUpdate();
    setTick((t) => t + 1);
  };

  const badgeFor = (t: { classifiedBy: string; approved: boolean }) => {
    if (t.approved) return <span className="cf-badge-green">✓ Aprovado</span>;
    if (t.classifiedBy === "auto") return <span className="cf-badge-accent">⚡ IA</span>;
    if (t.classifiedBy === "client") return <span className="cf-badge-blue">👤 Cliente</span>;
    if (t.classifiedBy === "accountant") return <span className="cf-badge-purple">✍ Contador</span>;
    return <span className="cf-badge-yellow">⏳ Pendente</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{client.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">{client.cnpj} · {client.regime} · {client.bank}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="cf-btn-primary"
            disabled={pending > 0}
            onClick={handleApproveAll}
          >
            ✓ Aprovar todos
          </button>
          <button className="cf-btn-secondary" onClick={() => onExport(client.id)}>
            📥 Exportar Domínio
          </button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="cf-card text-center">
          <p className="text-xs text-muted-foreground mb-1">IA</p>
          <p className="text-xl font-bold font-heading text-primary">{auto}</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Cliente</p>
          <p className="text-xl font-bold font-heading text-cf-blue">{byClient}</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Contador</p>
          <p className="text-xl font-bold font-heading text-cf-purple">{byAccountant}</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
          <p className="text-xl font-bold font-heading text-cf-yellow">{pending}</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Aprovados</p>
          <p className="text-xl font-bold font-heading text-cf-green">{approvedCount}</p>
        </div>
      </div>

      {/* Transaction table */}
      <div className="cf-card p-0 overflow-hidden">
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
              {txs.map((tx) => (
                <tr key={tx.id}>
                  <td className="text-muted-foreground whitespace-nowrap">{tx.date}</td>
                  <td className="font-medium">{tx.description}</td>
                  <td className={tx.type === "credit" ? "text-cf-green" : "text-cf-red"}>
                    {tx.type === "credit" ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    {tx.classifiedBy === "pending" ? (
                      <select
                        className="cf-select text-xs py-1"
                        defaultValue=""
                        onChange={(e) => handleClassify(tx.id, e.target.value)}
                      >
                        <option value="" disabled>Classificar</option>
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm">{tx.category}</span>
                    )}
                  </td>
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
