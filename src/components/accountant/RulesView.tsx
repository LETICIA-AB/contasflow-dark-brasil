import { useState } from "react";
import { CLASSIFICATION_RULES, classifyTransaction } from "@/data/classificationRules";
import { loadMemory, deleteMemoryEntry, type ClassificationMemory } from "@/data/memoryStore";
import { loadClients } from "@/data/store";

export default function RulesView() {
  const [testInput, setTestInput] = useState("");
  const [testType, setTestType] = useState<"debit" | "credit">("debit");
  const [testResult, setTestResult] = useState<{ category: string; ruleId: string; auto: true } | { auto: false } | null>(null);
  const [filterGroup, setFilterGroup] = useState("all");
  const [subTab, setSubTab] = useState<"rules" | "memory">("rules");
  const [memory, setMemory] = useState<ClassificationMemory[]>(loadMemory);

  const clients = loadClients();

  const handleTest = () => {
    if (!testInput.trim()) return;
    setTestResult(classifyTransaction(testInput, testType));
  };

  const handleDeleteMemory = (normalizedDesc: string, clientId: string) => {
    deleteMemoryEntry(normalizedDesc, clientId);
    setMemory(loadMemory());
  };

  const groups = [...new Set(CLASSIFICATION_RULES.map((r) => r.category))];
  const filtered = filterGroup === "all" ? CLASSIFICATION_RULES : CLASSIFICATION_RULES.filter((r) => r.category === filterGroup);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-6 cf-stagger">
      <div>
        <h2 className="text-2xl font-bold">Regras de Classificação IA</h2>
        <p className="text-muted-foreground text-sm mt-1">{CLASSIFICATION_RULES.length} regras · {memory.length} itens na memória</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-card rounded-lg border border-border p-1 w-fit">
        <button onClick={() => setSubTab("rules")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "rules" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Regras Regex ({CLASSIFICATION_RULES.length})
        </button>
        <button onClick={() => { setSubTab("memory"); setMemory(loadMemory()); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "memory" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          🧠 Memória ({memory.length})
        </button>
      </div>

      {subTab === "rules" && (
        <>
          {/* Tester */}
          <div className="cf-card border-primary/30">
            <h3 className="font-semibold mb-4">🧪 Testador Interativo</h3>
            <div className="flex flex-wrap gap-3">
              <input className="cf-input flex-1 min-w-[250px]" placeholder="Digite a descrição do extrato..." value={testInput} onChange={(e) => setTestInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTest()} />
              <select className="cf-select w-36" value={testType} onChange={(e) => setTestType(e.target.value as "debit" | "credit")}>
                <option value="debit">Débito (D)</option>
                <option value="credit">Crédito (C)</option>
              </select>
              <button className="cf-btn-primary" onClick={handleTest}>Testar</button>
            </div>
            {testResult && (
              <div className={`mt-4 p-3 rounded-lg ${testResult.auto ? "bg-primary/10 border border-primary/30" : "bg-cf-yellow/10 border border-cf-yellow/30"}`}>
                {testResult.auto ? (
                  <p className="text-sm"><span className="cf-badge-accent mr-2">⚡ {testResult.ruleId}</span> Classificada como <strong className="text-primary">{testResult.category}</strong></p>
                ) : (
                  <p className="text-sm text-cf-yellow">⏳ Nenhuma regra encontrada — transação ficaria pendente</p>
                )}
              </div>
            )}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterGroup === "all" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`} onClick={() => setFilterGroup("all")}>
              Todas ({CLASSIFICATION_RULES.length})
            </button>
            {groups.map((g) => (
              <button key={g} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterGroup === g ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`} onClick={() => setFilterGroup(g)}>
                {g} ({CLASSIFICATION_RULES.filter((r) => r.category === g).length})
              </button>
            ))}
          </div>

          {/* Rules table */}
          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead><tr><th>ID</th><th>Prioridade</th><th>Tipo</th><th>Categoria</th><th>Padrão (regex)</th><th>Exemplos</th></tr></thead>
                <tbody>
                  {filtered.map((rule) => (
                    <tr key={rule.id}>
                      <td className="font-mono text-primary font-bold">{rule.id}</td>
                      <td className="text-center">{rule.priority}</td>
                      <td className="text-center">
                        <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-center ${rule.type === "D" ? "bg-cf-red/20 text-cf-red" : rule.type === "C" ? "bg-cf-green/20 text-cf-green" : "bg-cf-blue/20 text-cf-blue"}`}>{rule.type}</span>
                      </td>
                      <td className="font-medium">{rule.category}</td>
                      <td className="font-mono text-xs text-muted-foreground max-w-[250px] truncate">{rule.pattern.source}</td>
                      <td className="text-xs text-muted-foreground">{rule.examples.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === "memory" && (
        <div className="space-y-4">
          {memory.length === 0 ? (
            <div className="cf-card text-center py-12">
              <p className="text-3xl mb-3">🧠</p>
              <p className="text-muted-foreground">Nenhuma classificação na memória ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">A memória será preenchida automaticamente conforme transações forem classificadas.</p>
            </div>
          ) : (
            <div className="cf-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="cf-table">
                  <thead><tr><th>Descrição normalizada</th><th>Categoria</th><th>Débito</th><th>Crédito</th><th>Empresa</th><th>Usos</th><th>Ações</th></tr></thead>
                  <tbody>
                    {memory.sort((a, b) => b.count - a.count).map((m, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{m.normalizedDesc}</td>
                        <td className="font-medium text-sm">{m.category}</td>
                        <td className="font-mono text-xs text-muted-foreground">{m.debitAccount}</td>
                        <td className="font-mono text-xs text-muted-foreground">{m.creditAccount}</td>
                        <td className="text-xs text-muted-foreground">{clientName(m.clientId)}</td>
                        <td className="text-center">
                          <span className={`cf-badge ${m.count >= 3 ? "bg-cf-green/15 text-cf-green" : m.count >= 2 ? "bg-cf-blue/15 text-cf-blue" : "bg-secondary text-muted-foreground"}`}>
                            {m.count}×
                          </span>
                        </td>
                        <td>
                          <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => handleDeleteMemory(m.normalizedDesc, m.clientId)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
