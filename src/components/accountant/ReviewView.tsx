import { useState, useMemo } from "react";
import { CATEGORIES, type Client, type Transaction, type ValidationFlag, loadClients, saveClients } from "@/data/store";
import { runValidation, getValidationSummary } from "@/data/validationEngine";

interface Props {
  client: Client;
  onUpdate: () => void;
  onExport: (clientId: string) => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  let color = "cf-green";
  let label = "Alta";
  if (score < 60) { color = "cf-red"; label = "Baixa"; }
  else if (score < 80) { color = "cf-yellow"; label = "Média"; }
  return (
    <span className={`cf-badge-${color} text-[10px] gap-1`}>
      <span className="font-bold">{score}%</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function FlagIcon({ severity }: { severity: string }) {
  if (severity === "error") return <span className="text-cf-red">⛔</span>;
  if (severity === "warning") return <span className="text-cf-yellow">⚠️</span>;
  return <span className="text-cf-blue">ℹ️</span>;
}

function RiskIndicator({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: { label: "Risco Baixo", badge: "cf-badge-green", icon: "🛡️" },
    medium: { label: "Risco Médio", badge: "cf-badge-yellow", icon: "⚡" },
    high: { label: "Risco Alto", badge: "cf-badge-red", icon: "🔴" },
  };
  const c = config[level];
  return <span className={c.badge}>{c.icon} {c.label}</span>;
}

type TabFilter = "all" | "flagged" | "validated" | "pending";

export default function ReviewView({ client, onUpdate, onExport }: Props) {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const validatedTxs = useMemo(() => runValidation(client), [client]);
  const summary = useMemo(() => getValidationSummary(validatedTxs), [validatedTxs]);

  const pending = validatedTxs.filter((t) => t.classifiedBy === "pending").length;

  const filteredTxs = useMemo(() => {
    switch (activeTab) {
      case "flagged": return validatedTxs.filter((t) => (t.validationFlags?.length ?? 0) > 0 && !t.validated && !t.approved);
      case "validated": return validatedTxs.filter((t) => t.validated || t.approved);
      case "pending": return validatedTxs.filter((t) => t.classifiedBy === "pending");
      default: return validatedTxs;
    }
  }, [validatedTxs, activeTab]);

  const mutate = (fn: (c: Client) => void) => {
    const clients = loadClients();
    const c = clients.find((cl) => cl.id === client.id);
    if (!c) return;
    fn(c);
    saveClients(clients);
    onUpdate();
    setTick((t) => t + 1);
  };

  const handleClassify = (txId: string, category: string) => {
    mutate((c) => {
      const tx = c.transactions.find((t) => t.id === txId);
      if (!tx) return;
      tx.category = category;
      tx.classifiedBy = "accountant";
    });
  };

  const handleValidate = (txId: string) => {
    mutate((c) => {
      const tx = c.transactions.find((t) => t.id === txId);
      if (!tx) return;
      tx.validated = true;
      tx.approved = true;
      tx.validationFlags = [];
      tx.confidenceScore = 100;
    });
    setExpandedTx(null);
  };

  const handleReject = (txId: string) => {
    mutate((c) => {
      const tx = c.transactions.find((t) => t.id === txId);
      if (!tx) return;
      tx.rejectedBy = "accountant";
      tx.validated = false;
      tx.approved = false;
      tx.category = "";
      tx.classifiedBy = "pending";
      tx.confidenceScore = 0;
    });
    setExpandedTx(null);
  };

  const handleAddNote = (txId: string) => {
    if (!noteInput.trim()) return;
    mutate((c) => {
      const tx = c.transactions.find((t) => t.id === txId);
      if (tx) tx.accountantNote = noteInput.trim();
    });
    setNoteInput("");
  };

  const handleValidateAll = () => {
    mutate((c) => {
      c.transactions.forEach((t) => {
        if (t.classifiedBy !== "pending") {
          t.validated = true;
          t.approved = true;
          t.validationFlags = [];
          t.confidenceScore = 100;
        }
      });
      if (!c.transactions.some((t) => t.classifiedBy === "pending")) {
        c.status = "approved";
      }
    });
  };

  const originBadge = (t: Transaction) => {
    if (t.validated || t.approved) return <span className="cf-badge-green text-[10px]">✓ Validado</span>;
    if (t.classifiedBy === "auto") return <span className="cf-badge-accent text-[10px]">⚡ IA {t.ruleId ?? ""}</span>;
    if (t.classifiedBy === "client") return <span className="cf-badge-blue text-[10px]">👤 Cliente</span>;
    if (t.classifiedBy === "accountant") return <span className="cf-badge-purple text-[10px]">✍ Contador</span>;
    return <span className="cf-badge-yellow text-[10px]">⏳ Pendente</span>;
  };

  const tabCounts: Record<TabFilter, number> = {
    all: validatedTxs.length,
    flagged: validatedTxs.filter((t) => (t.validationFlags?.length ?? 0) > 0 && !t.validated && !t.approved).length,
    validated: validatedTxs.filter((t) => t.validated || t.approved).length,
    pending: validatedTxs.filter((t) => t.classifiedBy === "pending").length,
  };

  return (
    <div className="space-y-6 cf-stagger">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{client.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">{client.cnpj} · {client.regime} · {client.bank}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="cf-btn-primary" disabled={pending > 0 || summary.errors > 0} onClick={handleValidateAll}>
            ✓ Validar todos
          </button>
          <button className="cf-btn-secondary" onClick={() => onExport(client.id)}>
            📥 Exportar
          </button>
        </div>
      </div>

      {/* Analytical Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="cf-card text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Confiança Média</p>
          <p className={`text-2xl font-bold font-heading ${
            summary.avgConfidence >= 80 ? "text-cf-green" : summary.avgConfidence >= 60 ? "text-cf-yellow" : "text-cf-red"
          }`}>{summary.avgConfidence}%</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nível de Risco</p>
          <div className="mt-1"><RiskIndicator level={summary.riskLevel} /></div>
        </div>
        <div className="cf-card text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Alertas</p>
          <p className="text-2xl font-bold font-heading">
            <span className="text-cf-red">{summary.errors}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-cf-yellow">{summary.warnings}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">erros / avisos</p>
        </div>
        <div className="cf-card text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Validados</p>
          <p className="text-2xl font-bold font-heading text-cf-green">
            {summary.validated}<span className="text-muted-foreground text-sm font-normal">/{summary.total}</span>
          </p>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="cf-card">
        <h3 className="text-sm font-semibold mb-3">Origem das Classificações</h3>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(summary.bySource).map(([src, count]) => {
            const labels: Record<string, string> = {
              auto: "⚡ IA Automática",
              client: "👤 Cliente",
              accountant: "✍ Contador",
              memory: "🧠 Memória IA",
              pending: "⏳ Pendente",
            };
            return (
              <div key={src} className="flex items-center gap-2">
                <span className="text-sm">{labels[src] ?? src}</span>
                <span className="cf-badge-accent text-xs">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "flagged", "validated", "pending"] as TabFilter[]).map((tab) => {
          const labels: Record<TabFilter, string> = {
            all: "Todas",
            flagged: "🚩 Com alertas",
            validated: "✓ Validadas",
            pending: "⏳ Pendentes",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cf-btn text-xs py-1.5 px-3 ${
                activeTab === tab
                  ? "text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === tab ? { background: "var(--gradient-primary)" } : {}}
            >
              {labels[tab]} ({tabCounts[tab]})
            </button>
          );
        })}
      </div>

      {/* Transaction table with validation */}
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
                <th>Confiança</th>
                <th>Alertas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.map((tx) => {
                const flagCount = tx.validationFlags?.length ?? 0;
                const isExpanded = expandedTx === tx.id;
                const hasFlags = flagCount > 0 && !tx.validated && !tx.approved;

                return (
                  <tr key={tx.id} className="group">
                    <td className="text-muted-foreground whitespace-nowrap text-xs">{tx.date}</td>
                    <td>
                      <button
                        className="font-medium text-left hover:text-primary transition-colors text-sm"
                        onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                      >
                        {tx.description}
                        {tx.accountantNote && <span className="ml-1 text-cf-blue text-[10px]">📝</span>}
                      </button>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="mt-3 space-y-3 animate-fade-in">
                          {/* Flags */}
                          {hasFlags && (
                            <div className="space-y-1.5">
                              {tx.validationFlags!.map((flag, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-secondary/50">
                                  <FlagIcon severity={flag.severity} />
                                  <span className="text-foreground">{flag.message}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Note */}
                          {tx.accountantNote && (
                            <div className="text-xs text-cf-blue px-3 py-2 rounded-lg bg-cf-blue/5 border border-cf-blue/10">
                              📝 {tx.accountantNote}
                            </div>
                          )}

                          {/* Add note input */}
                          <div className="flex gap-2">
                            <input
                              className="cf-input text-xs py-1.5 flex-1"
                              placeholder="Adicionar nota de revisão..."
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddNote(tx.id)}
                            />
                            <button className="cf-btn-secondary text-xs py-1.5 px-3" onClick={() => handleAddNote(tx.id)}>
                              Salvar nota
                            </button>
                          </div>

                          {/* Action buttons */}
                          {!tx.validated && !tx.approved && tx.classifiedBy !== "pending" && (
                            <div className="flex gap-2">
                              <button className="cf-btn-primary text-xs py-1.5 px-4" onClick={() => handleValidate(tx.id)}>
                                ✓ Validar
                              </button>
                              <button
                                className="cf-btn text-xs py-1.5 px-4 bg-cf-red/10 text-cf-red border border-cf-red/20 hover:bg-cf-red/20"
                                onClick={() => handleReject(tx.id)}
                              >
                                ✕ Rejeitar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`whitespace-nowrap text-sm ${tx.type === "credit" ? "text-cf-green" : "text-cf-red"}`}>
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
                        <span className="text-xs">{tx.category}</span>
                      )}
                    </td>
                    <td>{originBadge(tx)}</td>
                    <td><ConfidenceBadge score={tx.confidenceScore ?? 0} /></td>
                    <td>
                      {hasFlags ? (
                        <button
                          className="cf-badge-yellow text-[10px] cursor-pointer hover:opacity-80"
                          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                        >
                          🚩 {flagCount}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td>
                      {!tx.validated && !tx.approved && tx.classifiedBy !== "pending" && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-7 h-7 rounded-md flex items-center justify-center text-cf-green hover:bg-cf-green/10 transition-colors"
                            title="Validar"
                            onClick={() => handleValidate(tx.id)}
                          >
                            ✓
                          </button>
                          <button
                            className="w-7 h-7 rounded-md flex items-center justify-center text-cf-red hover:bg-cf-red/10 transition-colors"
                            title="Rejeitar"
                            onClick={() => handleReject(tx.id)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {(tx.validated || tx.approved) && (
                        <span className="text-cf-green text-xs">✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
