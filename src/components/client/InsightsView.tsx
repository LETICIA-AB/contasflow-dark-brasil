import { type Client, formatCurrency } from "@/data/store";
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Trophy, BarChart3, Lightbulb, Calendar } from "lucide-react";

interface Props {
  client: Client;
}

export default function InsightsView({ client }: Props) {
  const txs = client.transactions;
  const monthKeys = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const monthLabels = ["Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26", "Mar/26"];

  const debits = txs.filter((t) => t.type === "debit");
  const categories = [...new Set(debits.map((t) => t.category || "Não classificado"))];

  const catMonthly: Record<string, number[]> = {};
  categories.forEach((cat) => {
    catMonthly[cat] = monthKeys.map((mk) =>
      debits.filter((t) => (t.category || "Não classificado") === cat && t.date.startsWith(mk))
        .reduce((s, t) => s + t.amount, 0)
    );
  });

  const projections = categories.map((cat) => {
    const vals = catMonthly[cat];
    const last3 = vals.slice(-3);
    const avg = last3.reduce((s, v) => s + v, 0) / last3.length;
    const growth = last3.length >= 2 && last3[0] > 0
      ? ((last3[last3.length - 1] - last3[0]) / last3[0]) * 100
      : 0;
    return { cat, avg, growth, projected: [avg * 1.0, avg * (1 + growth / 300), avg * (1 + growth / 150)] };
  }).filter((p) => p.avg > 0).sort((a, b) => b.avg - a.avg);

  const totalExpenses = debits.reduce((s, t) => s + t.amount, 0);
  const topCats = categories.map((cat) => ({
    cat,
    total: debits.filter((t) => (t.category || "Não classificado") === cat).reduce((s, t) => s + t.amount, 0),
  })).sort((a, b) => b.total - a.total);

  const alerts = projections.filter((p) => p.growth > 20);

  const insights: { icon: "up" | "down" | "stable"; text: string }[] = [];
  projections.forEach((p) => {
    if (p.growth > 20) {
      insights.push({ icon: "up", text: `${p.cat} cresceu ${p.growth.toFixed(0)}% nos últimos 3 meses — atenção!` });
    } else if (p.growth < -15) {
      insights.push({ icon: "down", text: `${p.cat} reduziu ${Math.abs(p.growth).toFixed(0)}% — boa tendência.` });
    } else if (Math.abs(p.growth) <= 5 && p.avg > 0) {
      insights.push({ icon: "stable", text: `${p.cat} está estável em ~${formatCurrency(p.avg)}/mês.` });
    }
  });

  const insightIcon = (type: "up" | "down" | "stable") => {
    if (type === "up") return <TrendingUp className="w-4 h-4 text-cf-red shrink-0" />;
    if (type === "down") return <TrendingDown className="w-4 h-4 text-cf-green shrink-0" />;
    return <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold">Insights Financeiros</h2>
        <p className="text-muted-foreground text-sm mt-1">Projeções e tendências baseadas nos seus dados — {client.name}</p>
      </div>

      {alerts.length > 0 && (
        <div className="cf-card border-cf-red/30 bg-cf-red/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-cf-red" />
            <h3 className="font-semibold text-cf-red">Alertas de Tendência</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.cat} className="flex items-center justify-between text-sm">
                <span className="font-medium">{a.cat}</span>
                <span className="text-cf-red font-bold">↑ {a.growth.toFixed(0)}% crescimento</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Categories */}
      <div className="cf-card">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Top Categorias de Despesa</h3>
        </div>
        <div className="space-y-3">
          {topCats.slice(0, 6).map((tc, i) => {
            const pct = totalExpenses > 0 ? (tc.total / totalExpenses) * 100 : 0;
            return (
              <div key={tc.cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-5">{i + 1}°</span>
                    {tc.cat}
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(tc.total)} <span className="text-xs">({pct.toFixed(1)}%)</span></span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Projections */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <div>
            <h3 className="font-semibold">Projeção — Próximos 3 Meses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Baseado na média e tendência dos últimos 3 meses</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="cf-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="text-right">Média atual</th>
                <th className="text-right">Abr/26</th>
                <th className="text-right">Mai/26</th>
                <th className="text-right">Jun/26</th>
                <th className="text-right">Tendência</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr key={p.cat}>
                  <td className="font-medium">{p.cat}</td>
                  <td className="text-right text-sm">{formatCurrency(p.avg)}</td>
                  {p.projected.map((v, i) => (
                    <td key={i} className="text-right text-sm text-muted-foreground">{formatCurrency(v)}</td>
                  ))}
                  <td className={`text-right text-sm font-bold ${p.growth > 10 ? "text-cf-red" : p.growth < -10 ? "text-cf-green" : "text-muted-foreground"}`}>
                    {p.growth > 0 ? "↑" : p.growth < 0 ? "↓" : "→"} {Math.abs(p.growth).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Textual Insights */}
      <div className="cf-card">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Resumo Inteligente</h3>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                {insightIcon(item.icon)}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Dados insuficientes para gerar insights. Continue classificando suas transações.</p>
        )}
      </div>

      {/* Seasonality mini chart */}
      <div className="cf-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Despesas Totais por Mês</h3>
        </div>
        <svg viewBox={`0 0 ${monthKeys.length * 70} 100`} className="w-full max-w-lg h-24">
          {(() => {
            const totals = monthKeys.map((mk) => debits.filter((t) => t.date.startsWith(mk)).reduce((s, t) => s + t.amount, 0));
            const max = Math.max(...totals, 1);
            return totals.map((val, i) => (
              <g key={i}>
                <rect x={i * 70 + 10} y={85 - (val / max) * 70} width={45} height={(val / max) * 70} rx={4} fill="hsl(165,100%,41.6%)" opacity={0.7} />
                <text x={i * 70 + 32} y={96} textAnchor="middle" fontSize="9" fill="hsl(213,24%,47.1%)">{monthLabels[i]}</text>
              </g>
            ));
          })()}
        </svg>
      </div>
    </div>
  );
}
