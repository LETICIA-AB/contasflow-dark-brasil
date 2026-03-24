import { useState, useRef } from "react";
import { type Client, type User, type Upload, loadUsers, saveUsers, loadUploads, loadClients, saveClients, formatCNPJ, CATEGORIES } from "@/data/store";
import { loadBanks, saveBanks, addBank, type BankEntry } from "@/data/bankStore";
import { CHART_OF_ACCOUNTS, CATEGORY_DEBIT_MAP, CATEGORY_CREDIT_MAP, type Account } from "@/data/chartOfAccounts";
import { getActiveChart, saveCustomChart, clearCustomChart, saveClientChart, loadClientChart, removeClientChart, listAllClientCharts, findDuplicateChart, getActiveChartForClient } from "@/data/chartStore";
import * as XLSX from "xlsx";

interface Props {
  clients: Client[];
  onUpdate: () => void;
}

export default function AdminView({ clients, onUpdate }: Props) {
  const [subTab, setSubTab] = useState<"users" | "uploads" | "banks" | "chart">("users");
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [uploads] = useState<Upload[]>(loadUploads);
  const [editing, setEditing] = useState<string | null>(null);
  const [formCnpj, setFormCnpj] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClientId, setFormClientId] = useState("");
  const [formBanks, setFormBanks] = useState<string[]>([]);
  const [banks, setBanks] = useState<BankEntry[]>(loadBanks);
  const [newBankName, setNewBankName] = useState("");
  const [newBankCode, setNewBankCode] = useState("");

  const refreshUsers = () => setUsers(loadUsers());

  const startCreate = () => {
    setEditing("new");
    setFormCnpj("");
    setFormPassword("");
    setFormClientId("");
    setFormBanks([]);
  };

  const startEdit = (u: User) => {
    setEditing(u.id);
    setFormCnpj(u.cnpj);
    setFormPassword(u.password);
    setFormClientId(u.clientId);
    const c = clients.find((cl) => cl.id === u.clientId);
    setFormBanks(c?.banks || []);
  };

  const handleSave = () => {
    const allUsers = loadUsers();
    if (editing === "new") {
      allUsers.push({
        id: `u-${Date.now()}`,
        cnpj: formCnpj,
        password: formPassword,
        clientId: formClientId,
        active: true,
        lastLogin: null,
      });
    } else {
      const u = allUsers.find((x) => x.id === editing);
      if (u) { u.cnpj = formCnpj; u.password = formPassword; u.clientId = formClientId; }
    }
    saveUsers(allUsers);
    if (formClientId) {
      const allClients = loadClients();
      const c = allClients.find((cl) => cl.id === formClientId);
      if (c) { c.banks = formBanks; saveClients(allClients); }
    }
    refreshUsers();
    setEditing(null);
    onUpdate();
  };

  const toggleActive = (userId: string) => {
    const allUsers = loadUsers();
    const u = allUsers.find((x) => x.id === userId);
    if (u) u.active = !u.active;
    saveUsers(allUsers);
    refreshUsers();
  };

  const deleteUser = (userId: string) => {
    if (!window.confirm("Excluir este usuário?")) return;
    saveUsers(loadUsers().filter((u) => u.id !== userId));
    refreshUsers();
  };

  const toggleBank = (name: string) => {
    setFormBanks((prev) => prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]);
  };

  const handleAddBank = () => {
    if (!newBankName.trim()) return;
    addBank(newBankName.trim(), newBankCode.trim());
    setBanks(loadBanks());
    setNewBankName("");
    setNewBankCode("");
  };

  const toggleBankActive = (id: string) => {
    const all = loadBanks();
    const b = all.find((x) => x.id === id);
    if (b) b.active = !b.active;
    saveBanks(all);
    setBanks(loadBanks());
  };

  const deleteBank = (id: string) => {
    saveBanks(loadBanks().filter((b) => b.id !== id));
    setBanks(loadBanks());
  };

  const clientName = (cid: string) => clients.find((c) => c.id === cid)?.name ?? "—";

  const handleClientSelect = (cid: string) => {
    setFormClientId(cid);
    const c = clients.find((cl) => cl.id === cid);
    if (c) { setFormCnpj(c.cnpj); setFormBanks(c.banks || []); }
  };

  const tabs = [
    { id: "users", label: "Usuários" },
    { id: "uploads", label: "Extratos" },
    { id: "banks", label: "Bancos" },
    { id: "chart", label: "Plano de Contas" },
  ] as const;

  return (
    <div className="space-y-6 cf-stagger">
      <h2 className="text-2xl font-bold">Administração</h2>

      <div className="flex gap-1 bg-card rounded-lg border border-border p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS ── */}
      {subTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="cf-btn-primary" onClick={startCreate}>+ Novo usuário</button>
          </div>

          {editing && (
            <div className="cf-card space-y-4 border-primary/30">
              <h3 className="font-semibold">{editing === "new" ? "Novo usuário" : "Editar usuário"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Empresa</label>
                  <select className="cf-select" value={formClientId} onChange={(e) => handleClientSelect(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">CNPJ</label>
                  <input className="cf-input" value={formCnpj} onChange={(e) => setFormCnpj(formatCNPJ(e.target.value))} maxLength={18} />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Senha</label>
                  <input className="cf-input" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Bancos utilizados</label>
                <div className="flex flex-wrap gap-2">
                  {banks.filter((b) => b.active).map((b) => (
                    <label key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${formBanks.includes(b.name) ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                      <input type="checkbox" className="sr-only" checked={formBanks.includes(b.name)} onChange={() => toggleBank(b.name)} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="cf-btn-primary" onClick={handleSave} disabled={!formClientId || !formCnpj || !formPassword}>Salvar</button>
                <button className="cf-btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th>CNPJ</th>
                    <th>Empresa</th>
                    <th>Bancos</th>
                    <th>Último acesso</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const c = clients.find((cl) => cl.id === u.clientId);
                    return (
                      <tr key={u.id}>
                        <td className="font-heading">{u.cnpj}</td>
                        <td>{clientName(u.clientId)}</td>
                        <td className="text-xs text-muted-foreground">{c?.banks?.join(", ") || "—"}</td>
                        <td className="text-muted-foreground text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}</td>
                        <td>{u.active ? <span className="cf-badge-green">Ativo</span> : <span className="cf-badge-red">Inativo</span>}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => startEdit(u)}>Editar</button>
                            <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => toggleActive(u.id)}>{u.active ? "Pausar" : "Ativar"}</button>
                            <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => deleteUser(u.id)}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOADS ── */}
      {subTab === "uploads" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clients.map((c) => (
              <div key={c.id} className="cf-card">
                <p className="text-muted-foreground text-xs mb-1">{c.name}</p>
                <p className="text-2xl font-bold font-heading">{uploads.filter((u) => u.clientId === c.id).length}</p>
              </div>
            ))}
          </div>
          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr><th>Arquivo</th><th>Empresa</th><th>Período</th><th>Banco</th><th>Data/Hora</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.filename}</td>
                      <td>{clientName(u.clientId)}</td>
                      <td>{u.period}</td>
                      <td>{u.bank}</td>
                      <td className="text-muted-foreground">{u.date}</td>
                      <td><span className="cf-badge-green">✓ {u.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BANKS ── */}
      {subTab === "banks" && (
        <div className="space-y-4">
          <div className="cf-card space-y-4 border-primary/30">
            <h3 className="font-semibold">Adicionar banco</h3>
            <div className="flex gap-3 flex-wrap">
              <input className="cf-input flex-1 min-w-[200px]" placeholder="Nome do banco" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} />
              <input className="cf-input w-32" placeholder="Código COMPE" value={newBankCode} onChange={(e) => setNewBankCode(e.target.value)} />
              <button className="cf-btn-primary" onClick={handleAddBank} disabled={!newBankName.trim()}>Adicionar</button>
            </div>
          </div>
          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr><th>Nome</th><th>Código</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {banks.map((b) => (
                    <tr key={b.id}>
                      <td className="font-medium">{b.name}</td>
                      <td className="font-mono text-muted-foreground">{b.code || "—"}</td>
                      <td>{b.active ? <span className="cf-badge-green">Ativo</span> : <span className="cf-badge-red">Inativo</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => toggleBankActive(b.id)}>{b.active ? "Desativar" : "Ativar"}</button>
                          <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => deleteBank(b.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CHART OF ACCOUNTS PER CLIENT ── */}
      {subTab === "chart" && <ChartTab clients={clients} onUpdate={onUpdate} />}
    </div>
  );
}

// ── Chart Tab Component ──
function ChartTab({ clients, onUpdate }: {
  clients: Client[];
  onUpdate: () => void;
}) {
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
  const overrideClient = clients.find((c) => c.id === overrideClientId);
  const activeChartForOverride = getActiveChartForClient(overrideClientId);

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

        // Check for duplicates
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
    <div className="space-y-6">
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

        {/* Duplicate detection */}
        {duplicateClients.length > 0 && importPreview && (
          <div className="px-4 py-3 rounded-lg bg-cf-blue/10 border border-cf-blue/30 space-y-2">
            <p className="text-cf-blue text-sm font-medium">
              ℹ Este plano já está vinculado a: {duplicateClients.map((id) => clientName(id)).join(", ")}
            </p>
            <p className="text-cf-blue/80 text-xs">Você pode continuar importando para a empresa selecionada ou replicar para outra.</p>
          </div>
        )}

        {/* Preview */}
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

      {/* Full chart view */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Plano Ativo — {clientName(overrideClientId)}</h3>
          <span className="text-xs text-muted-foreground">{activeChartForOverride.length} contas</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="cf-table">
            <thead><tr><th>Seq</th><th>Código</th><th>Nome</th><th>Tipo</th><th>Grupo</th></tr></thead>
            <tbody>
              {activeChartForOverride.map((a) => (
                <tr key={a.code}>
                  <td className="text-muted-foreground text-xs">{a.seq}</td>
                  <td className="font-mono text-primary font-bold">{a.code}</td>
                  <td className="font-medium">{a.name}</td>
                  <td>
                    <span className={`inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-center ${
                      a.type === "A" ? "bg-cf-blue/20 text-cf-blue" : a.type === "R" ? "bg-cf-green/20 text-cf-green" : "bg-cf-red/20 text-cf-red"
                    }`}>{a.type}</span>
                  </td>
                  <td className="text-muted-foreground text-xs">{a.group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function clientName(id: string) {
    return clients.find((c) => c.id === id)?.name ?? "—";
  }
}
