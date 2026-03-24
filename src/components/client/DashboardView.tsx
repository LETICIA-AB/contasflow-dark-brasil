import { useState } from "react";
import { type Client, formatCurrency } from "@/data/store";

interface Props {
  client: Client;
}

export default function DashboardView({ client }: Props) {
  const txs = client.transactions;
  const allMonthKeys = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const allMonthLabels = ["Out/25", "Nov/25", "Dez/25", "Jan/26", "Fev/26", "Mar/26"];

  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(allMonthKeys.length - 1);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const monthKeys = allMonthKeys.slice(fromIdx, toIdx + 1);
  const monthLabels = allMonthLabels.slice(fromIdx, toIdx + 1);

  const credits = txs.filter((t) => t.type === "credit");
  const debits = txs.filter((t) => t.type === "debit");
  const totalIn = credits.reduce((s, t) => s + t.amount, 0);
  const totalOut = debits.reduce((s, t) => s + t.amount, 0);
  const balance = totalIn - totalOut;
  const pending = txs.filter((t) => t.classifiedBy === "pending").length;

  // Monthly data
  const monthlyData = monthKeys.map((mk, i) => {
    const mCredits = txs.filter((t) => t.date.startsWith(mk) && t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const mDebits = txs.filter((t) => t.date.startsWith(mk) && t.type === "debit").reduce((s, t) => s + t.amount, 0);
    return { label: monthLabels[i], credits: mCredits, debits: mDebits };
  });
  const maxVal = Math.max(...monthlyData.flatMap((m) => [m.credits, m.debits]), 1);

  // Category breakdown by month (horizontal analysis)
  const categories = [...new Set(debits.map((t) => t.category || "Não classificado"))];
  const catByMonth: Record<string, number[]> = {};
  categories.forEach((cat) => {
    catByMonth[cat] = monthKeys.map((mk) =>
      txs.filter((t) => t.type === "debit" && (t.category || "Não classificado") === cat && t.date.startsWith(mk))
        .reduce((s, t) => s + t.amount, 0)
    );
  });

  // Totals per month
  const monthTotals = monthKeys.map((_, i) =>
    categories.reduce((s, cat) => s + (catByMonth[cat]?.[i] || 0), 0)
  );

  const variation = (vals: number[]) => {
    if (vals.length < 2) return { abs: 0, pct: 0 };
    const last = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    return { abs: last - prev, pct: prev > 0 ? ((last - prev) / prev) * 100 : 0 };
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Financeiro</h2>
        <p className="text-muted-foreground text-sm mt-1">{client.name}</p>
      </div>

      {pending > 0 && (
        <div className="cf-card border-cf-yellow/30 bg-cf-yellow/5">
          <p className="text-cf-yellow text-sm font-medium">⚠ {pending} transações aguardando classificação</p>
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
          <p className={`text-2xl font-bold font-heading ${balance >= 0 ? "text-cf-green" : "text-cf-red"}`}>{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* SVG Bar chart */}
      <div className="cf-card">
        <h3 className="font-semibold mb-4">Evolução mensal</h3>
        <svg viewBox={`0 0 ${Math.max(monthlyData.length * 100, 300)} 200`} className="w-full">
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

      {/* Horizontal Analysis */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Análise Horizontal — Despesas por Categoria</h3>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-muted-foreground">De:</label>
            <select className="cf-select py-1 px-2 w-28" value={fromIdx} onChange={(e) => setFromIdx(Number(e.target.value))}>
              {allMonthLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
            <label className="text-muted-foreground">Até:</label>
            <select className="cf-select py-1 px-2 w-28" value={toIdx} onChange={(e) => setToIdx(Number(e.target.value))}>
              {allMonthLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="cf-table">
            <thead>
              <tr>
                <th>Categoria</th>
                {monthLabels.map((l) => <th key={l} className="text-right">{l}</th>)}
                <th className="text-right">Var (R$)</th>
                <th className="text-right">Var (%)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const vals = catByMonth[cat];
                const v = variation(vals);
                const isExpanded = expandedCat === cat;
                const maxCatVal = Math.max(...vals, 1);
                const avg = vals.reduce((s, x) => s + x, 0) / vals.length;
                const trend = vals.length >= 2 ? (vals[vals.length - 1] > vals[0] ? "↑" : vals[vals.length - 1] < vals[0] ? "↓" : "→") : "→";
                return (
                  <>
                    <tr key={cat} className="cursor-pointer" onClick={() => setExpandedCat(isExpanded ? null : cat)}>
                      <td className="font-medium">{cat}</td>
                      {vals.map((val, i) => <td key={i} className="text-right text-sm tabular-nums">{val > 0 ? formatCurrency(val) : "—"}</td>)}
                      <td className={`text-right text-sm font-medium ${v.abs > 0 ? "text-cf-red" : v.abs < 0 ? "text-cf-green" : ""}`}>
                        {v.abs !== 0 ? `${v.abs > 0 ? "+" : ""}${formatCurrency(v.abs)}` : "—"}
                      </td>
                      <td className={`text-right text-sm font-medium ${v.pct > 0 ? "text-cf-red" : v.pct < 0 ? "text-cf-green" : ""}`}>
                        {v.pct !== 0 ? `${v.pct > 0 ? "↑" : "↓"}${Math.abs(v.pct).toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-center text-muted-foreground">{isExpanded ? "▲" : "📊"}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${cat}-chart`}>
                        <td colSpan={monthLabels.length + 4} className="bg-secondary/20 p-4">
                          <div className="flex items-end gap-3">
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground mr-4">
                              <p>Média: <span className="text-foreground font-medium">{formatCurrency(avg)}</span></p>
                              <p>Tendência: <span className={`font-bold ${trend === "↑" ? "text-cf-red" : trend === "↓" ? "text-cf-green" : ""}`}>{trend} {trend === "↑" ? "Crescente" : trend === "↓" ? "Decrescente" : "Estável"}</span></p>
                            </div>
                            <svg viewBox={`0 0 ${vals.length * 60} 80`} className="flex-1 max-w-md h-20">
                              {vals.map((val, i) => {
                                const h = (val / maxCatVal) * 60;
                                return (
                                  <g key={i}>
                                    <rect x={i * 60 + 5} y={70 - h} width={40} height={h} rx={3} fill="hsl(165,100%,41.6%)" opacity={0.7} />
                                    <text x={i * 60 + 25} y={78} textAnchor="middle" fontSize="8" fill="hsl(213,24%,47.1%)">{monthLabels[i]}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {/* Totals row */}
              <tr className="font-bold bg-secondary/30">
                <td>TOTAL</td>
                {monthTotals.map((val, i) => <td key={i} className="text-right text-sm">{formatCurrency(val)}</td>)}
                <td className="text-right text-sm">{formatCurrency(variation(monthTotals).abs)}</td>
                <td className="text-right text-sm">{variation(monthTotals).pct.toFixed(1)}%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="cf-card text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span>Regime: {client.regime}</span>
        <span>Banco: {client.bank}</span>
        <span>CNPJ: {client.cnpj}</span>
      </div>
    </div>
  );
}
