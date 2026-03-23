import { useState } from "react";
import { CLASSIFICATION_RULES, classifyTransaction } from "@/data/classificationRules";

export default function RulesView() {
  const [testInput, setTestInput] = useState("");
  const [testType, setTestType] = useState<"debit" | "credit">("debit");
  const [testResult, setTestResult] = useState<{ category: string; ruleId: string; auto: true } | { auto: false } | null>(null);
  const [filterGroup, setFilterGroup] = useState("all");

  const handleTest = () => {
    if (!testInput.trim()) return;
    const result = classifyTransaction(testInput, testType);
    setTestResult(result);
  };

  const groups = [...new Set(CLASSIFICATION_RULES.map((r) => r.category))];
  const filtered = filterGroup === "all" ? CLASSIFICATION_RULES : CLASSIFICATION_RULES.filter((r) => r.category === filterGroup);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Regras de Classificação IA</h2>
        <p className="text-muted-foreground text-sm mt-1">{CLASSIFICATION_RULES.length} regras em {groups.length} categorias</p>
      </div>

      {/* Tester */}
      <div className="cf-card border-primary/30">
        <h3 className="font-semibold mb-4">🧪 Testador Interativo</h3>
        <div className="flex flex-wrap gap-3">
          <input
            className="cf-input flex-1 min-w-[250px]"
            placeholder="Digite a descrição do extrato..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTest()}
          />
          <select className="cf-select w-36" value={testType} onChange={(e) => setTestType(e.target.value as "debit" | "credit")}>
            <option value="debit">Débito (D)</option>
            <option value="credit">Crédito (C)</option>
          </select>
          <button className="cf-btn-primary" onClick={handleTest}>Testar</button>
        </div>
        {testResult && (
          <div className={`mt-4 p-3 rounded-lg ${testResult.auto ? "bg-primary/10 border border-primary/30" : "bg-cf-yellow/10 border border-cf-yellow/30"}`}>
            {testResult.auto ? (
              <p className="text-sm">
                <span className="cf-badge-accent mr-2">⚡ {testResult.ruleId}</span>
                Classificada como <strong className="text-primary">{testResult.category}</strong>
              </p>
            ) : (
              <p className="text-sm text-cf-yellow">⏳ Nenhuma regra encontrada — transação ficaria pendente</p>
            )}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterGroup === "all" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          onClick={() => setFilterGroup("all")}
        >
          Todas ({CLASSIFICATION_RULES.length})
        </button>
        {groups.map((g) => {
          const count = CLASSIFICATION_RULES.filter((r) => r.category === g).length;
          return (
            <button
              key={g}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterGroup === g ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              onClick={() => setFilterGroup(g)}
            >
              {g} ({count})
            </button>
          );
        })}
      </div>

      {/* Rules table */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cf-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prioridade</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Padrão (regex)</th>
                <th>Exemplos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-mono text-primary font-bold">{rule.id}</td>
                  <td className="text-center">{rule.priority}</td>
                  <td className="text-center">
                    <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-center ${
                      rule.type === "D" ? "bg-cf-red/20 text-cf-red" : rule.type === "C" ? "bg-cf-green/20 text-cf-green" : "bg-cf-blue/20 text-cf-blue"
                    }`}>
                      {rule.type}
                    </span>
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
    </div>
  );
}
