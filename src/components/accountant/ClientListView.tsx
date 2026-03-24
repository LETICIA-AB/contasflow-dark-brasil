import type { Client } from "@/data/store";
import { formatCurrency } from "@/data/store";

interface Props {
  clients: Client[];
  onSelectClient: (clientId: string) => void;
}

export default function ClientListView({ clients, onSelectClient }: Props) {
  const classify = clients.filter((c) => c.status === "classify").length;
  const review = clients.filter((c) => c.status === "review").length;
  const approved = clients.filter((c) => c.status === "approved").length;

  const statusBadge = (s: string) => {
    if (s === "classify") return <span className="cf-badge-yellow">🏷️ Classificar</span>;
    if (s === "review") return <span className="cf-badge-blue">📋 Revisar</span>;
    return <span className="cf-badge-green">✓ Aprovado</span>;
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold">Carteira de Clientes</h2>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada das empresas</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cf-card border-cf-yellow/30">
          <p className="text-muted-foreground text-sm mb-1">Pendências</p>
          <p className="text-3xl font-bold font-heading text-cf-yellow">{classify}</p>
        </div>
        <div className="cf-card border-cf-blue/30">
          <p className="text-muted-foreground text-sm mb-1">Para revisar</p>
          <p className="text-3xl font-bold font-heading text-cf-blue">{review}</p>
        </div>
        <div className="cf-card border-cf-green/30">
          <p className="text-muted-foreground text-sm mb-1">Aprovadas</p>
          <p className="text-3xl font-bold font-heading text-cf-green">{approved}</p>
        </div>
      </div>

      {/* Client cards */}
      <div className="grid gap-4">
        {clients.map((c) => {
          const pendingCount = c.transactions.filter((t) => t.classifiedBy === "pending").length;
          const totalIn = c.transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
          return (
            <div
              key={c.id}
              onClick={() => onSelectClient(c.id)}
              className="cf-card cursor-pointer hover:border-primary/40 transition-all group"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{c.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.cnpj} · {c.regime}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.bank}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  {statusBadge(c.status)}
                  {pendingCount > 0 && (
                    <span className="text-xs text-cf-yellow">{pendingCount} pendentes</span>
                  )}
                  <span className="text-sm font-heading font-bold text-cf-green">{formatCurrency(totalIn)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
