import { type Client, formatCurrency } from "@/data/store";

interface Props {
  client: Client;
}

export default function DashboardView({ client }: Props) {
  const txs = client.transactions;
  const credits = txs.filter((t) => t.type === "credit");
  const debits = txs.filter((t) => t.type === "debit");
  const totalIn = credits.reduce((s, t) => s + t.amount, 0);
  const totalOut = debits.reduce((s, t) => s + t.amount, 0);
  const balance = totalIn - totalOut;
  const pending = txs.filter((t) => t.classifiedBy === "pending").length;

  // Monthly data for chart (last 6 months)
  const months = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
  const monthKeys = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const monthlyData = monthKeys.map((mk, i) => {
    const mCredits = txs.filter((t) => t.date.startsWith(mk) && t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const mDebits = txs.filter((t) => t.date.startsWith(mk) && t.type === "debit").reduce((s, t) => s + t.amount, 0);
    return { label: months[i], credits: mCredits, debits: mDebits };
  });
  const maxVal = Math.max(...monthlyData.flatMap((m) => [m.credits, m.debits]), 1);

  // Category breakdown
  const catTotals: Record<string, number> = {};
  debits.forEach((t) => {
    const cat = t.category || "Não classificado";
    catTotals[cat] = (catTotals[cat] || 0) + t.amount;
  });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries.length > 0 ? catEntries[0][1] : 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
        <p className="text-muted-foreground text-sm mt-1">{client.name}</p>
      </div>

      {pending > 0 && (
        <div className="cf-card border-cf-yellow/30 bg-cf-yellow/5">
          <p className="text-cf-yellow text-sm font-medium">
            ⚠ {pending} transações aguardando classificação
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cf-card">
          <p className="text-muted-foreground text-sm mb-1">Entradas</p>
          <p className="text-2xl font-bold font-heading text-cf-green">{formatCurrency(totalIn)}</p>
        </div>
        <div className="cf-card">
          <p className="text-muted-foreground text-sm mb-1">Saídas</p>
          <p className="text-2xl font-bold font-heading text-cf-red">{formatCurrency(totalOut)}</p>
        </div>
        <div className="cf-card">
          <p className="text-muted-foreground text-sm mb-1">Saldo</p>
          <p className={`text-2xl font-bold font-heading ${balance >= 0 ? "text-cf-green" : "text-cf-red"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* SVG Bar chart */}
      <div className="cf-card">
        <h3 className="font-semibold mb-4">Evolução mensal</h3>
        <svg viewBox="0 0 600 200" className="w-full">
          {monthlyData.map((m, i) => {
            const x = i * 100 + 20;
            const creditH = (m.credits / maxVal) * 150;
            const debitH = (m.debits / maxVal) * 150;
            return (
              <g key={i}>
                <rect x={x} y={180 - creditH} width={30} height={creditH} rx={4} fill="hsl(160,65%,50.4%)" opacity={0.8} />
                <rect x={x + 35} y={180 - debitH} width={30} height={debitH} rx={4} fill="hsl(0,94%,71%)" opacity={0.8} />
                <text x={x + 32} y={196} textAnchor="middle" fill="hsl(213,24%,47.1%)" fontSize="11" fontFamily="DM Sans">{m.label}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cf-green inline-block" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cf-red inline-block" /> Saídas</span>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="cf-card">
        <h3 className="font-semibold mb-4">Despesas por categoria</h3>
        <div className="space-y-3">
          {catEntries.map(([cat, val]) => (
            <div key={cat}>
              <div className="flex justify-between text-sm mb-1">
                <span>{cat}</span>
                <span className="text-muted-foreground">{formatCurrency(val)}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(val / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="cf-card text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span>Regime: {client.regime}</span>
        <span>Banco: {client.bank}</span>
        <span>CNPJ: {client.cnpj}</span>
        <span>Período: Mar/2026</span>
      </div>
    </div>
  );
}
