import { useMemo } from "react";
import { motion } from "framer-motion";
import { type Client, loadClients } from "@/data/store";
import { runValidation, getValidationSummary, type ValidationSummary } from "@/data/validationEngine";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Users, ArrowRightLeft, Bot, AlertTriangle } from "lucide-react";

interface Props {
  clients: Client[];
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const hoverCard = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -2, transition: { duration: 0.25, ease: "easeOut" } },
};

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

    const chartData = clientData.map((d) => ({
      name: d.client.name.split(" ").slice(0, 2).join(" "),
      receita: d.totalCredit,
      despesa: d.totalDebit,
    }));

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

  const summaryCards = [
    {
      label: "Clientes",
      value: analytics.clientCount,
      icon: Users,
      gradient: "from-[hsl(212,85%,58%)] to-[hsl(212,70%,45%)]",
      iconBg: "bg-[hsl(212,85%,58%,0.12)]",
      iconColor: "text-cf-blue",
    },
    {
      label: "Transações",
      value: analytics.totalTx,
      icon: ArrowRightLeft,
      gradient: "from-[hsl(260,70%,65%)] to-[hsl(260,60%,50%)]",
      iconBg: "bg-[hsl(260,70%,65%,0.12)]",
      iconColor: "text-cf-purple",
    },
    {
      label: "Automação IA",
      value: `${analytics.automationRate}%`,
      icon: Bot,
      gradient: "from-primary to-[hsl(170,80%,34%)]",
      iconBg: "bg-primary/12",
      iconColor: "text-primary",
      highlight: true,
      sub: "classificadas por IA + Memória",
    },
    {
      label: "Alertas Ativos",
      value: analytics.totalAlerts,
      icon: AlertTriangle,
      gradient: analytics.totalAlerts > 0 ? "from-[hsl(0,72%,55%)] to-[hsl(0,60%,45%)]" : "from-primary to-[hsl(170,80%,34%)]",
      iconBg: analytics.totalAlerts > 0 ? "bg-[hsl(0,72%,55%,0.12)]" : "bg-primary/12",
      iconColor: analytics.totalAlerts > 0 ? "text-cf-red" : "text-cf-green",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold font-heading">Painel Geral</h2>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada de todos os clientes</p>
      </motion.div>

      {/* Summary cards with gradients */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover="hover"
          >
            <motion.div
              variants={hoverCard}
              className={`cf-card relative overflow-hidden ${card.highlight ? "border-primary/30" : ""}`}
            >
              {/* Subtle gradient overlay */}
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.06] blur-2xl -translate-y-6 translate-x-6`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">{card.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold font-heading ${card.highlight ? "text-primary" : card.iconColor}`}>
                  {card.value}
                </p>
                {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Revenue vs Expense chart */}
      <motion.div
        className="cf-card relative overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
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
      </motion.div>

      {/* Risk ranking + Recent alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="cf-card p-0 overflow-hidden relative"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Ranking de Risco</h3>
          </div>
          <div className="divide-y divide-border/50">
            {analytics.riskRanking.map((r, i) => (
              <motion.div
                key={i}
                className="px-5 py-3 flex items-center justify-between transition-colors hover:bg-secondary/20"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.35 }}
              >
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
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="cf-card p-0 overflow-hidden relative"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
        >
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-destructive/40 via-destructive/10 to-transparent" />
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Alertas Recentes</h3>
          </div>
          {analytics.recentAlerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {analytics.recentAlerts.map((a, i) => (
                <motion.div
                  key={i}
                  className="px-5 py-3 transition-colors hover:bg-secondary/20"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.35 }}
                >
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
                        f.severity === "error" ? "bg-destructive/10 text-cf-red" :
                        f.severity === "warning" ? "bg-cf-yellow/10 text-cf-yellow" :
                        "bg-cf-blue/10 text-cf-blue"
                      }`}>
                        {f.message}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum alerta ativo
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
