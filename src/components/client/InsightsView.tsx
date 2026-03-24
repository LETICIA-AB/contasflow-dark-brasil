import { type Client, formatCurrency } from "@/data/store";
import {
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Trophy,
  BarChart3, Lightbulb, Calendar, ShieldAlert, CheckCircle2,
  Banknote, Users, Receipt, Scale, Info,
} from "lucide-react";

interface Props {
  client: Client;
}

// ── Month helpers ─────────────────────────────────────────────────────────────
const MONTH_ABBREVS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function toLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_ABBREVS[m] ?? m}/${y.slice(2)}`;
}

function addMonths(ym: string, n: number): string {
  const d = new Date(`${ym}-01`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="cf-card text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold font-heading ${color ?? "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Observation item ──────────────────────────────────────────────────────────
type ObsType = "warning" | "good" | "info" | "alert";
interface Observation { type: ObsType; text: string }

function ObsItem({ obs }: { obs: Observation }) {
  const cfg: Record<ObsType, { icon: React.ReactNode; cls: string }> = {
    alert:   { icon: <ShieldAlert  className="w-4 h-4 shrink-0 mt-0.5 text-cf-red"           />, cls: "border-cf-red/20    bg-cf-red/5    text-foreground" },
    warning: { icon: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-cf-yellow"        />, cls: "border-cf-yellow/20 bg-cf-yellow/5 text-foreground" },
    good:    { icon: <CheckCircle2  className="w-4 h-4 shrink-0 mt-0.5 text-cf-green"         />, cls: "border-cf-green/20  bg-cf-green/5  text-foreground" },
    info:    { icon: <Info          className="w-4 h-4 shrink-0 mt-0.5 text-cf-blue"          />, cls: "border-cf-blue/20   bg-cf-blue/5   text-foreground" },
  };
  const { icon, cls } = cfg[obs.type];
  return (
    <div className={`flex items-start gap-2 text-sm px-3 py-2.5 rounded-lg border ${cls}`}>
      {icon}
      <span>{obs.text}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InsightsView({ client }: Props) {
  const txs = client.transactions;

  // ── Derive actual months from data ─────────────────────────────────────────
  const uniqueMonths = [...new Set(txs.map((t) => t.date.slice(0, 7)).filter(Boolean))].sort();
  const monthKeys   = uniqueMonths.slice(-6);   // last 6 months of data
  const monthLabels = monthKeys.map(toLabel);
  const lastMonth   = monthKeys[monthKeys.length - 1] ?? new Date().toISOString().slice(0, 7);
  const projMonths  = [1, 2, 3].map((n) => addMonths(lastMonth, n));
  const projLabels  = projMonths.map(toLabel);

  const credits = txs.filter((t) => t.type === "credit");
  const debits  = txs.filter((t) => t.type === "debit");

  // ── Aggregate helpers ─────────────────────────────────────────────────────
  const sumCat = (cat: string) =>
    debits.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);

  const totalRevenue  = credits.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = debits.reduce((s, t) => s + t.amount, 0);
  const netResult     = totalRevenue - totalExpenses;
  const margin        = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

  // Tax
  const taxAmount  = sumCat("Impostos e Tributos");
  const taxBurden  = totalRevenue > 0 ? (taxAmount / totalRevenue) * 100 : 0;

  // Payroll
  const payroll      = sumCat("Folha de Pagamento");
  const payrollRatio = totalRevenue > 0 ? (payroll / totalRevenue) * 100 : 0;

  // Fixed costs
  const fixedCosts     = ["Aluguel", "Serviços Contratados", "Despesas Bancárias"].reduce((s, c) => s + sumCat(c), 0);
  const fixedCostRatio = totalRevenue > 0 ? (fixedCosts / totalRevenue) * 100 : 0;

  // Loans
  const loanAmount = sumCat("Empréstimos e Financiamentos");
  const loanRatio  = totalRevenue > 0 ? (loanAmount / totalRevenue) * 100 : 0;

  // Withdrawals
  const withdrawals = sumCat("Retiradas dos Sócios");

  // Revenue trend (last 3 months)
  const last3Months  = monthKeys.slice(-3);
  const last3Revs    = last3Months.map((mk) => credits.filter((t) => t.date.startsWith(mk)).reduce((s, t) => s + t.amount, 0));
  const revGrowth    = last3Revs.length >= 2 && last3Revs[0] > 0
    ? ((last3Revs[last3Revs.length - 1] - last3Revs[0]) / last3Revs[0]) * 100 : 0;

  // Last month balance
  const lastMonthRev  = credits.filter((t) => t.date.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0);
  const lastMonthExp  = debits.filter((t) => t.date.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0);
  const lastMonthBal  = lastMonthRev - lastMonthExp;

  // ── Per-category data for projections ─────────────────────────────────────
  const catNames = [...new Set(debits.map((t) => t.category || "Não classificado"))];
  const catMonthly: Record<string, number[]> = {};
  catNames.forEach((cat) => {
    catMonthly[cat] = monthKeys.map((mk) =>
      debits.filter((t) => (t.category || "Não classificado") === cat && t.date.startsWith(mk))
        .reduce((s, t) => s + t.amount, 0)
    );
  });

  const projections = catNames.map((cat) => {
    const vals = catMonthly[cat];
    const last3 = vals.slice(-3);
    const avg = last3.reduce((s, v) => s + v, 0) / (last3.length || 1);
    const growth = last3.length >= 2 && last3[0] > 0
      ? ((last3[last3.length - 1] - last3[0]) / last3[0]) * 100 : 0;
    return {
      cat, avg, growth,
      projected: [avg, avg * (1 + growth / 300), avg * (1 + growth / 150)],
    };
  }).filter((p) => p.avg > 0).sort((a, b) => b.avg - a.avg);

  // Top expense categories
  const topCats = catNames.map((cat) => ({
    cat,
    total: debits.filter((t) => (t.category || "Não classificado") === cat).reduce((s, t) => s + t.amount, 0),
  })).sort((a, b) => b.total - a.total);

  // ── Monthly totals for bar chart ─────────────────────────────────────────
  const monthlyTotals = monthKeys.map((mk) => ({
    label: toLabel(mk),
    revenue: credits.filter((t) => t.date.startsWith(mk)).reduce((s, t) => s + t.amount, 0),
    expenses: debits.filter((t) => t.date.startsWith(mk)).reduce((s, t) => s + t.amount, 0),
  }));
  const chartMax = Math.max(...monthlyTotals.flatMap((m) => [m.revenue, m.expenses]), 1);

  // ── AI Accountant Observations ────────────────────────────────────────────
  const observations: Observation[] = [];

  if (txs.length === 0) {
    observations.push({ type: "info", text: "Nenhuma transação carregada. Envie extratos bancários para gerar análise financeira completa." });
  } else {
    // Operating result
    if (margin < 0) {
      observations.push({ type: "alert", text: `Resultado operacional negativo de ${Math.abs(margin).toFixed(1)}% — empresa operando com prejuízo. Revisão urgente de estrutura de custos recomendada.` });
    } else if (margin < 10) {
      observations.push({ type: "warning", text: `Margem operacional de ${margin.toFixed(1)}% está abaixo do mínimo recomendado de 10%. Avaliar precificação ou corte de despesas.` });
    } else if (margin >= 20) {
      observations.push({ type: "good", text: `Margem operacional saudável de ${margin.toFixed(1)}% — empresa bem posicionada financeiramente.` });
    }

    // Tax burden
    if (taxAmount > 0) {
      if (taxBurden > 30) {
        observations.push({ type: "alert", text: `Carga tributária elevada: ${taxBurden.toFixed(1)}% da receita bruta. Avaliar planejamento tributário e possibilidade de mudança de regime.` });
      } else if (taxBurden > 15) {
        observations.push({ type: "warning", text: `Carga tributária de ${taxBurden.toFixed(1)}% — acima do referencial de eficiência (<15%). Verificar aproveitamento de créditos e deduções.` });
      } else {
        observations.push({ type: "good", text: `Carga tributária de ${taxBurden.toFixed(1)}% dentro da faixa eficiente para o regime ${client.regime}.` });
      }
    }

    // Payroll ratio
    if (payroll > 0 && totalRevenue > 0) {
      if (payrollRatio > 50) {
        observations.push({ type: "alert", text: `Folha de pagamento representa ${payrollRatio.toFixed(1)}% da receita — muito acima do limite saudável (35-40%). Avaliar estrutura de pessoal e produtividade.` });
      } else if (payrollRatio > 40) {
        observations.push({ type: "warning", text: `Índice de pessoal em ${payrollRatio.toFixed(1)}% da receita — no limite superior. Monitorar crescimento da folha em relação ao faturamento.` });
      } else if (payrollRatio > 0 && payrollRatio <= 35) {
        observations.push({ type: "good", text: `Índice de pessoal de ${payrollRatio.toFixed(1)}% sobre receita — dentro do parâmetro saudável (≤35%).` });
      }
    }

    // Revenue trend
    if (revGrowth > 15) {
      observations.push({ type: "good", text: `Receita cresceu ${revGrowth.toFixed(1)}% nos últimos 3 meses — tendência positiva de expansão. Atenção ao acompanhamento de custos no mesmo ritmo.` });
    } else if (revGrowth < -10) {
      observations.push({ type: "alert", text: `Queda de ${Math.abs(revGrowth).toFixed(1)}% na receita nos últimos 3 meses — monitorar fluxo de caixa, reduzir despesas variáveis e rever prazos.` });
    }

    // Last month balance
    if (lastMonthBal < 0) {
      observations.push({ type: "warning", text: `Último mês com resultado negativo de ${formatCurrency(Math.abs(lastMonthBal))} — atenção ao capital de giro e possível necessidade de crédito de curto prazo.` });
    }

    // Fixed cost burden
    if (fixedCostRatio > 40) {
      observations.push({ type: "warning", text: `Custos fixos (aluguel + serviços + taxas) representam ${fixedCostRatio.toFixed(1)}% da receita — alto grau de alavancagem operacional. Receita reduzida impacta diretamente o resultado.` });
    }

    // Loan burden
    if (loanRatio > 20) {
      observations.push({ type: "warning", text: `${loanRatio.toFixed(1)}% da receita comprometida com empréstimos e financiamentos. Avaliar renegociação de condições ou amortização antecipada se houver liquidez.` });
    }

    // Withdrawals vs result
    if (withdrawals > 0 && netResult > 0 && withdrawals > netResult * 0.8) {
      observations.push({ type: "warning", text: `Retiradas dos sócios (${formatCurrency(withdrawals)}) representam ${((withdrawals / netResult) * 100).toFixed(0)}% do resultado operacional — pouco capital reinvestido no negócio.` });
    }

    // Regime-specific
    if (client.regime === "Simples Nacional" && taxBurden > 15) {
      observations.push({ type: "info", text: `Para Simples Nacional, carga acima de 15% pode indicar que o regime de Lucro Presumido seja mais vantajoso — solicite uma simulação ao seu contador.` });
    }
    if (client.regime === "Lucro Real") {
      observations.push({ type: "info", text: `No Lucro Real é essencial documentar todas as despesas dedutíveis. Verifique se INSS patronal, FGTS e juros de empréstimos estão sendo corretamente classificados.` });
    }
    if (client.regime === "Lucro Presumido" && payroll > 0) {
      observations.push({ type: "info", text: `No Lucro Presumido, pró-labore e salários são dedutíveis. Certifique-se de que a distribuição de lucros (não tributada) está separada do pró-labore na classificação.` });
    }

    // Expense concentration alert
    if (topCats.length > 0 && totalExpenses > 0) {
      const top = topCats[0];
      const concentration = (top.total / totalExpenses) * 100;
      if (concentration > 60) {
        observations.push({ type: "info", text: `Alta concentração: "${top.cat}" representa ${concentration.toFixed(0)}% das despesas totais. Diversificar a estrutura de custos reduz o risco operacional.` });
      }
    }
  }

  // ── No-data state ─────────────────────────────────────────────────────────
  if (txs.length === 0) {
    return (
      <div className="space-y-6 cf-stagger">
        <div>
          <h2 className="text-2xl font-bold">Insights Financeiros</h2>
          <p className="text-muted-foreground text-sm mt-1">Análise inteligente — perspectiva de contador moderno</p>
        </div>
        <div className="cf-card text-center py-16">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-lg font-semibold">Sem dados para analisar</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Envie extratos bancários na aba <strong>Envios</strong> e classifique as transações. Os insights serão gerados automaticamente a partir dos dados reais.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 cf-stagger">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Insights Financeiros</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Análise inteligente de {client.name} · {client.regime} · {monthKeys.length} {monthKeys.length === 1 ? "mês" : "meses"} de dados
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Receita Total"
          value={formatCurrency(totalRevenue)}
          sub={revGrowth !== 0 ? `${revGrowth > 0 ? "↑" : "↓"} ${Math.abs(revGrowth).toFixed(1)}% (3m)` : undefined}
          color="text-cf-green"
        />
        <KpiCard
          label="Despesas Totais"
          value={formatCurrency(totalExpenses)}
          color="text-cf-red"
        />
        <KpiCard
          label="Resultado"
          value={formatCurrency(netResult)}
          sub={`Margem: ${margin.toFixed(1)}%`}
          color={netResult >= 0 ? "text-cf-green" : "text-cf-red"}
        />
        <KpiCard
          label="Últ. Mês"
          value={formatCurrency(lastMonthBal)}
          sub={toLabel(lastMonth)}
          color={lastMonthBal >= 0 ? "text-cf-green" : "text-cf-red"}
        />
      </div>

      {/* Indicadores de Gestão */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4 text-muted-foreground" /> Indicadores de Gestão
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Carga Tributária", value: `${taxBurden.toFixed(1)}%`, icon: Receipt, ref: "<15%", ok: taxBurden <= 15 },
            { label: "Índice de Pessoal",  value: `${payrollRatio.toFixed(1)}%`, icon: Users, ref: "≤35%", ok: payrollRatio <= 35 },
            { label: "Custos Fixos / Rec.", value: `${fixedCostRatio.toFixed(1)}%`, icon: Banknote, ref: "<40%", ok: fixedCostRatio < 40 },
            { label: "Dívida / Rec.",       value: `${loanRatio.toFixed(1)}%`, icon: TrendingDown, ref: "<20%", ok: loanRatio < 20 },
          ].map(({ label, value, icon: Icon, ref, ok }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <p className={`text-lg font-bold font-heading ${ok ? "text-cf-green" : "text-cf-red"}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">Ref: {ref}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Accountant Observations */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground" /> Observações do Contador
        </h3>
        <div className="space-y-2">
          {observations.map((obs, i) => <ObsItem key={i} obs={obs} />)}
        </div>
      </div>

      {/* Top Expense Categories */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" /> Composição das Despesas
        </h3>
        <div className="space-y-3">
          {topCats.slice(0, 7).map((tc, i) => {
            const pct = totalExpenses > 0 ? (tc.total / totalExpenses) * 100 : 0;
            return (
              <div key={tc.cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}°</span>
                    {tc.cat}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCurrency(tc.total)} <span className="text-xs">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Evolution Chart */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" /> Evolução Mensal
        </h3>
        <svg viewBox={`0 0 ${Math.max(monthKeys.length * 90, 300)} 110`} className="w-full max-w-2xl h-28">
          {monthlyTotals.map((m, i) => {
            const revH   = (m.revenue  / chartMax) * 80;
            const expH   = (m.expenses / chartMax) * 80;
            const x      = i * 90 + 10;
            return (
              <g key={i}>
                <rect x={x}      y={90 - revH} width={32} height={revH} rx={3} fill="hsl(var(--cf-green))" opacity={0.85} />
                <rect x={x + 36} y={90 - expH} width={32} height={expH} rx={3} fill="hsl(var(--cf-red))"   opacity={0.85} />
                <text x={x + 36} y={104} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{m.label}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex gap-6 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-cf-green inline-block" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-cf-red inline-block"   /> Saídas</span>
        </div>
      </div>

      {/* Cash Flow Projection */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Projeção de Fluxo de Caixa — {projLabels.join(", ")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Baseado na média e tendência dos últimos 3 meses de dados reais</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="cf-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="text-right">Média atual</th>
                {projLabels.map((l) => <th key={l} className="text-right">{l}</th>)}
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

      {/* Regime footer */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span>Regime tributário: <strong>{client.regime}</strong></span>
        <span>Banco principal: <strong>{client.bank}</strong></span>
        <span>CNPJ: {client.cnpj}</span>
        <span className="ml-auto">Análise gerada a partir de {txs.length} transações</span>
      </div>
    </div>
  );
}
