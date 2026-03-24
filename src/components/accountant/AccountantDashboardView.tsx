import { useMemo } from "react";
import { type Client, loadClients } from "@/data/store";
import { runValidation, getValidationSummary, type ValidationSummary } from "@/data/validationEngine";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface Props {
  clients: Client[];
}

export default function AccountantDashboardView({ clients }: Props) {
  const analytics = useMemo(() => {
    const allClients = loadClients();

    const clientData = allClients.map((c) => {
      const validated = runValidation(c);
      const summary = getValidationSummary(validated);
      const totalCredit = c.transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
      const totalDebit = c.transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
      return { client: c, summary, totalCredit, totalDebit, validated };
    });

    const totalTx = allClients.reduce((s, c) => s + c.transactions.length, 0);
    const autoCount = allClients.reduce((s, c) => s + c.transactions.filter((t) => t.classifiedBy === "auto" || t.classifiedBy === "memory").length, 0);
    const automationRate = totalTx > 0 ? Math.round((autoCount / totalTx) * 100) : 0;
    const totalAlerts = clientData.reduce((s, d) => s + d.summary.flagged, 0);
    const avgConfidence = clientData.length > 0
      ? Math.round(clientData.reduce((s, d) => s + d.summary.avgConfidence, 0) / clientData.length)
      : 0;

    // Revenue vs Expense chart data
    const chartData = clientData.map((d) => ({
      name: d.client.name.split(" ").slice(0, 2).join(" "),
      receita: d.totalCredit,
      despesa: d.totalDebit,
    }));

    // Risk ranking
    const riskRanking = clientData
      .map((d) => ({
        name: d.client.name,
        riskLevel: d.summary.riskLevel,
        avgConfidence: d.summary.avgConfidence,
        flagged: d.summary.flagged,
        status: d.client.status,
      }))
      .sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      });

    // Recent alerts
    const recentAlerts = clientData.flatMap((d) =>
      d.validated
        .filter((tx) => (tx.validationFlags?.length ?? 0) > 0 && !tx.validated && !tx.approved)
        .slice(0, 3)
        .map((tx) => ({
          clientName: d.client.name,
          txDescription: tx.description,
          flags: tx.validationFlags || [],
          amount: tx.amount,
          type: tx.type,
        }))
    ).slice(0, 8);

    return { clientData, totalTx, automationRate, totalAlerts, avgConfidence, chartData, riskRanking, recentAlerts, clientCount: allClients.length };
  }, [clients]);

  const riskBadge = (level: string) => {
    if (level === "high") return <span className="cf-badge-red">Alto</span>;
    if (level === "medium") return <span className="cf-badge-yellow">Médio</span>;
    return <span className="cf-badge-green">Baixo</span>;
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <span className="cf-badge-green">Aprovado</span>;
    if (s === "review") return <span className="cf-badge-blue">Em revisão</span>;
    return <span className="cf-badge-yellow">Classificando</span>;
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold font-heading">Painel Geral</h2>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada de todos os clientes</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cf-card">
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">Clientes</p>
          <p className="text-3xl font-bold font-heading">{analytics.clientCount}</p>
        </div>
        <div className="cf-card">
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">Transações</p>
          <p className="text-3xl font-bold font-heading">{analytics.totalTx}</p>
        </div>
        <div className="cf-card border-primary/30">
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">Automação IA</p>
          <p className="text-3xl font-bold font-heading text-primary">{analytics.automationRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">classificadas por IA + Memória</p>
        </div>
        <div className="cf-card">
          <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">Alertas Ativos</p>
          <p className={`text-3xl font-bold font-heading ${analytics.totalAlerts > 0 ? "text-cf-red" : "text-cf-green"}`}>
            {analytics.totalAlerts}
          </p>
        </div>
      </div>

      {/* Revenue vs Expense chart */}
      <div className="cf-card">
        <h3 className="font-semibold mb-4">Receita vs Despesa por Cliente</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]}
              />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--cf-green))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--cf-red))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk ranking + Recent alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk ranking */}
        <div className="cf-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Ranking de Risco</h3>
          </div>
          <div className="divide-y divide-border/50">
            {analytics.riskRanking.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Confiança: {r.avgConfidence}% · {r.flagged} alerta(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(r.status)}
                  {riskBadge(r.riskLevel)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="cf-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Alertas Recentes</h3>
          </div>
          {analytics.recentAlerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {analytics.recentAlerts.map((a, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{a.clientName}</p>
                    <span className={a.type === "credit" ? "text-cf-green text-xs" : "text-cf-red text-xs"}>
                      {a.type === "credit" ? "+" : "-"}R$ {a.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-0.5">{a.txDescription}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.flags.map((f, j) => (
                      <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        f.severity === "error" ? "bg-cf-red/10 text-cf-red" :
                        f.severity === "warning" ? "bg-cf-yellow/10 text-cf-yellow" :
                        "bg-cf-blue/10 text-cf-blue"
                      }`}>
                        {f.message}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum alerta ativo 🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
