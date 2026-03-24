import { useState, useRef } from "react";
import { type Client, CATEGORIES, loadClients, saveClients } from "@/data/store";
import { CHART_OF_ACCOUNTS, CATEGORY_DEBIT_MAP, CATEGORY_CREDIT_MAP, type Account } from "@/data/chartOfAccounts";
import { getActiveChart, saveCustomChart, clearCustomChart, saveClientChart, loadClientChart, removeClientChart, listAllClientCharts, findDuplicateChart, getActiveChartForClient } from "@/data/chartStore";
import * as XLSX from "xlsx";

interface Props {
  clients: Client[];
  onUpdate: () => void;
}

export default function AccountsView({ clients, onUpdate }: Props) {
  const [filterGroup, setFilterGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [subView, setSubView] = useState<"browse" | "manage">("manage");

  // Chart management state
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Account[] | null>(null);
  const [importError, setImportError] = useState("");
  const [importMode, setImportMode] = useState<"preview" | "done" | null>(null);
  const [targetClientId, setTargetClientId] = useState(clients[0]?.id || "");
  const [duplicateClients, setDuplicateClients] = useState<string[]>([]);
  const [replicateTarget, setReplicateTarget] = useState("");
  const [overrideClientId, setOverrideClientId] = useState(clients[0]?.id || "");
  const [, setTick] = useState(0);

  const clientCharts = listAllClientCharts();
  const activeChartForOverride = getActiveChartForClient(overrideClientId);
  const overrideClient = clients.find((c) => c.id === overrideClientId);

  const groups = [...new Set(CHART_OF_ACCOUNTS.map((a) => a.group))];

  const filtered = CHART_OF_ACCOUNTS.filter((a) => {
    if (filterGroup !== "all" && a.group !== filterGroup) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.code.includes(search)) return false;
    return true;
  });

  const typeBadge = (t: string) => {
    if (t === "A") return <span className="cf-badge-blue">Ativo</span>;
    if (t === "R") return <span className="cf-badge-green">Receita</span>;
    return <span className="cf-badge-red">Despesa</span>;
  };

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  // === Import logic ===
  const parseType = (val: string): "A" | "R" | "D" => {
    const v = (val || "").toString().trim().toUpperCase();
    if (v === "A" || v === "ATIVO" || v === "ASSET") return "A";
    if (v === "R" || v === "RECEITA" || v === "REVENUE") return "R";
    return "D";
  };

  const handleFileImport = (file: File) => {
    setImportError("");
    setImportPreview(null);
    setDuplicateClients([]);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      setImportError("Formato não suportado. Use CSV, XLS ou XLSX.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (rows.length === 0) {
          setImportError("Arquivo vazio ou sem dados reconhecíveis.");
          return;
        }

        const keys = Object.keys(rows[0]);
        const findCol = (patterns: string[]) =>
          keys.find((k) => patterns.some((p) => k.toLowerCase().includes(p))) || "";

        const codeCol = findCol(["codigo", "código", "code", "conta", "account"]) || keys[0];
        const nameCol = findCol(["nome", "name", "descricao", "descrição", "description"]) || keys[1];
        const typeCol = findCol(["tipo", "type", "natureza"]);
        const groupCol = findCol(["grupo", "group", "classificacao", "classificação"]);

        const accounts: Account[] = rows.map((row, i) => ({
          code: String(row[codeCol] || "").trim(),
          seq: i + 1,
          name: String(row[nameCol] || "").trim(),
          type: parseType(String(row[typeCol] || "D")),
          group: String(row[groupCol] || "Importado").trim(),
        })).filter((a) => a.code && a.name);

        if (accounts.length === 0) {
          setImportError(`Nenhuma conta válida. Colunas detectadas: ${keys.join(", ")}`);
          return;
        }

        const dupes = findDuplicateChart(accounts);
        setDuplicateClients(dupes);
        setImportPreview(accounts);
        setImportMode("preview");
      } catch {
        setImportError("Erro ao processar o arquivo.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!importPreview || !targetClientId) return;
    saveClientChart(targetClientId, importPreview);
    setImportPreview(null);
    setImportMode("done");
    setDuplicateClients([]);
    setTick((t) => t + 1);
    setTimeout(() => setImportMode(null), 3000);
  };

  const handleReplicate = () => {
    if (!replicateTarget) return;
    const sourceChart = loadClientChart(targetClientId);
    if (!sourceChart) return;
    saveClientChart(replicateTarget, sourceChart);
    setReplicateTarget("");
    setTick((t) => t + 1);
  };

  const handleRemoveClientChart = (clientId: string) => {
    if (!window.confirm("Remover plano personalizado? A empresa usará o plano padrão.")) return;
    removeClientChart(clientId);
    setTick((t) => t + 1);
  };

  const handleOverride = (category: string, field: "debit" | "credit", value: string) => {
    const allClients = loadClients();
    const c = allClients.find((cl) => cl.id === overrideClientId);
    if (!c) return;
    if (!c.chartOverrides) c.chartOverrides = {};
    if (!c.chartOverrides[category]) c.chartOverrides[category] = { debit: "", credit: "" };
    c.chartOverrides[category][field] = value;
    if (!c.chartOverrides[category].debit && !c.chartOverrides[category].credit) {
      delete c.chartOverrides[category];
    }
    saveClients(allClients);
    onUpdate();
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Plano de Contas</h2>
          <p className="text-muted-foreground text-sm mt-1">{CHART_OF_ACCOUNTS.length} contas · Gestão por empresa</p>
        </div>
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          <button
            onClick={() => setSubView("manage")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subView === "manage" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Gestão
          </button>
          <button
            onClick={() => setSubView("browse")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subView === "browse" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Consultar
          </button>
        </div>
      </div>

      {subView === "manage" && (
        <>
          {/* Client chart summary */}
          <div className="cf-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">📋 Plano de Contas por Empresa</h3>
              <p className="text-xs text-muted-foreground mt-1">Cada empresa pode ter seu próprio plano de contas importado</p>
            </div>
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr><th>Empresa</th><th>Plano</th><th>Qtd Contas</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const clientChart = clientCharts.find((cc) => cc.clientId === c.id);
                    const hasCustom = !!clientChart;
                    return (
                      <tr key={c.id}>
                        <td className="font-medium">{c.name}</td>
                        <td>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${hasCustom ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                            {hasCustom ? "Personalizado" : "Padrão"}
                          </span>
                        </td>
                        <td className="font-mono text-sm">{hasCustom ? clientChart.accountCount : CHART_OF_ACCOUNTS.length}</td>
                        <td>
                          {hasCustom && (
                            <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => handleRemoveClientChart(c.id)}>
                              Remover
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import section */}
          <div className="cf-card border-primary/30 space-y-4">
            <h3 className="font-semibold">📥 Importar Plano de Contas</h3>
            <p className="text-xs text-muted-foreground">
              Selecione a empresa destino e importe um CSV/Excel com: <span className="font-mono text-primary">código, nome, tipo (A/R/D), grupo</span>
            </p>

            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Empresa destino</label>
                <select className="cf-select w-56" value={targetClientId} onChange={(e) => setTargetClientId(e.target.value)}>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="cf-btn-primary" onClick={() => fileRef.current?.click()}>
                📁 Selecionar arquivo
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileImport(f);
                  e.target.value = "";
                }}
              />
              <button
                className="cf-btn-secondary text-xs"
                onClick={() => {
                  const csv = "codigo,nome,tipo,grupo\n110001,Caixa Geral,A,Caixa e Bancos\n310001,Salários,D,Pessoal\n410001,Receita de Vendas,R,Receitas";
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "modelo_plano_contas.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                ⬇ Baixar modelo CSV
              </button>
            </div>

            {importError && (
              <div className="px-3 py-2 rounded-lg bg-cf-red/10 border border-cf-red/30">
                <p className="text-cf-red text-sm">❌ {importError}</p>
              </div>
            )}

            {duplicateClients.length > 0 && importPreview && (
              <div className="px-4 py-3 rounded-lg bg-cf-blue/10 border border-cf-blue/30 space-y-2">
                <p className="text-cf-blue text-sm font-medium">
                  ℹ Este plano já está vinculado a: {duplicateClients.map((id) => clientName(id)).join(", ")}
                </p>
                <p className="text-cf-blue/80 text-xs">Você pode continuar importando para a empresa selecionada ou replicar para outra.</p>
              </div>
            )}

            {importPreview && importMode === "preview" && (
              <div className="space-y-3">
                <div className="px-3 py-2 rounded-lg bg-cf-green/10 border border-cf-green/30">
                  <p className="text-cf-green text-sm font-medium">
                    📋 {importPreview.length} contas — {importPreview.filter((a) => a.type === "A").length} Ativos, {importPreview.filter((a) => a.type === "R").length} Receitas, {importPreview.filter((a) => a.type === "D").length} Despesas
                  </p>
                  <p className="text-cf-green/80 text-xs mt-1">
                    Vinculando a: <strong>{clientName(targetClientId)}</strong>
                  </p>
                </div>
                <div className="cf-card p-0 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="cf-table">
                    <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Grupo</th></tr></thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((a, i) => (
                        <tr key={i}>
                          <td className="font-mono text-primary">{a.code}</td>
                          <td className="font-medium">{a.name}</td>
                          <td>
                            <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-center ${
                              a.type === "A" ? "bg-cf-blue/20 text-cf-blue" : a.type === "R" ? "bg-cf-green/20 text-cf-green" : "bg-cf-red/20 text-cf-red"
                            }`}>{a.type}</span>
                          </td>
                          <td className="text-muted-foreground text-xs">{a.group}</td>
                        </tr>
                      ))}
                      {importPreview.length > 20 && (
                        <tr><td colSpan={4} className="text-center text-muted-foreground text-xs py-2">... e mais {importPreview.length - 20}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <button className="cf-btn-primary" onClick={confirmImport}>
                    ✓ Vincular a {clientName(targetClientId)} ({importPreview.length} contas)
                  </button>
                  <button className="cf-btn-secondary" onClick={() => { setImportPreview(null); setImportMode(null); setDuplicateClients([]); }}>Cancelar</button>
                </div>
              </div>
            )}

            {importMode === "done" && (
              <div className="px-3 py-2 rounded-lg bg-cf-green/10 border border-cf-green/30">
                <p className="text-cf-green text-sm font-medium">✓ Plano vinculado com sucesso a {clientName(targetClientId)}!</p>
              </div>
            )}
          </div>

          {/* Replicate */}
          {clientCharts.length > 0 && (
            <div className="cf-card space-y-3">
              <h3 className="font-semibold text-sm">🔄 Replicar plano para outra empresa</h3>
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Copiar de</label>
                  <select className="cf-select w-52" value={targetClientId} onChange={(e) => setTargetClientId(e.target.value)}>
                    {clients.filter((c) => clientCharts.some((cc) => cc.clientId === c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Para</label>
                  <select className="cf-select w-52" value={replicateTarget} onChange={(e) => setReplicateTarget(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {clients.filter((c) => c.id !== targetClientId).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button className="cf-btn-primary text-sm" onClick={handleReplicate} disabled={!replicateTarget}>
                  Replicar
                </button>
              </div>
            </div>
          )}

          {/* Overrides per client */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Overrides por empresa:</label>
              <select className="cf-select w-64" value={overrideClientId} onChange={(e) => setOverrideClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">Sobrescreva as contas contábeis padrão para esta empresa.</p>

            <div className="cf-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="cf-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Débito (padrão)</th>
                      <th>Débito (empresa)</th>
                      <th>Crédito (padrão)</th>
                      <th>Crédito (empresa)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat) => {
                      const defaultDebit = CATEGORY_DEBIT_MAP[cat] || "";
                      const defaultCredit = CATEGORY_CREDIT_MAP[cat] || "";
                      const override = overrideClient?.chartOverrides?.[cat];
                      return (
                        <tr key={cat}>
                          <td className="font-medium">{cat}</td>
                          <td className="font-mono text-xs text-muted-foreground">{defaultDebit || "—"}</td>
                          <td>
                            <select
                              className="cf-select py-1 px-2 text-xs"
                              value={override?.debit || ""}
                              onChange={(e) => handleOverride(cat, "debit", e.target.value)}
                            >
                              <option value="">Padrão</option>
                              {activeChartForOverride.filter((a) => a.type === "D" || a.type === "A").map((a) => (
                                <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="font-mono text-xs text-muted-foreground">{defaultCredit || "—"}</td>
                          <td>
                            <select
                              className="cf-select py-1 px-2 text-xs"
                              value={override?.credit || ""}
                              onChange={(e) => handleOverride(cat, "credit", e.target.value)}
                            >
                              <option value="">Padrão</option>
                              {activeChartForOverride.filter((a) => a.type === "R" || a.type === "A").map((a) => (
                                <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {subView === "browse" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="cf-card border-cf-blue/30">
              <p className="text-muted-foreground text-sm mb-1">Ativo</p>
              <p className="text-3xl font-bold font-heading text-cf-blue">{CHART_OF_ACCOUNTS.filter((a) => a.type === "A").length}</p>
            </div>
            <div className="cf-card border-cf-green/30">
              <p className="text-muted-foreground text-sm mb-1">Receita</p>
              <p className="text-3xl font-bold font-heading text-cf-green">{CHART_OF_ACCOUNTS.filter((a) => a.type === "R").length}</p>
            </div>
            <div className="cf-card border-cf-red/30">
              <p className="text-muted-foreground text-sm mb-1">Despesa</p>
              <p className="text-3xl font-bold font-heading text-cf-red">{CHART_OF_ACCOUNTS.filter((a) => a.type === "D").length}</p>
            </div>
          </div>

          {/* Search */}
          <input
            className="cf-input w-full max-w-md"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Group filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterGroup === "all" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              onClick={() => setFilterGroup("all")}
            >
              Todos ({CHART_OF_ACCOUNTS.length})
            </button>
            {groups.map((g) => {
              const count = CHART_OF_ACCOUNTS.filter((a) => a.group === g).length;
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

          {/* Table */}
          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Grupo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.code}>
                      <td className="text-muted-foreground">{a.seq}</td>
                      <td className="font-mono font-bold text-primary">{a.code}</td>
                      <td className="font-medium">{a.name}</td>
                      <td>{typeBadge(a.type)}</td>
                      <td className="text-sm text-muted-foreground">{a.group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
