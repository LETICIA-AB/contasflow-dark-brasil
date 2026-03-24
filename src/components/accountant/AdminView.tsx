import { useState } from "react";
import { type Client, type User, type Upload, loadUsers, saveUsers, loadUploads, loadClients, saveClients, formatCNPJ, CATEGORIES } from "@/data/store";
import { loadBanks, saveBanks, addBank, type BankEntry } from "@/data/bankStore";
import { CHART_OF_ACCOUNTS, CATEGORY_DEBIT_MAP, CATEGORY_CREDIT_MAP } from "@/data/chartOfAccounts";

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
  const [chartClientId, setChartClientId] = useState(clients[0]?.id || "");

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
    // Update client banks
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

  // Chart overrides
  const chartClient = clients.find((c) => c.id === chartClientId);
  const handleOverride = (category: string, field: "debit" | "credit", value: string) => {
    const allClients = loadClients();
    const c = allClients.find((cl) => cl.id === chartClientId);
    if (!c) return;
    if (!c.chartOverrides) c.chartOverrides = {};
    if (!c.chartOverrides[category]) c.chartOverrides[category] = { debit: "", credit: "" };
    c.chartOverrides[category][field] = value;
    // Clean empty
    if (!c.chartOverrides[category].debit && !c.chartOverrides[category].credit) {
      delete c.chartOverrides[category];
    }
    saveClients(allClients);
    onUpdate();
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
    <div className="space-y-6 animate-fade-in">
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

              {/* Bank checkboxes */}
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
      {subTab === "chart" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Empresa:</label>
            <select className="cf-select w-64" value={chartClientId} onChange={(e) => setChartClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Sobrescreva as contas contábeis padrão para esta empresa. Deixe em branco para usar o padrão.</p>

          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Conta Débito (padrão)</th>
                    <th>Conta Débito (empresa)</th>
                    <th>Conta Crédito (padrão)</th>
                    <th>Conta Crédito (empresa)</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => {
                    const defaultDebit = CATEGORY_DEBIT_MAP[cat] || "";
                    const defaultCredit = CATEGORY_CREDIT_MAP[cat] || "";
                    const override = chartClient?.chartOverrides?.[cat];
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
                            {CHART_OF_ACCOUNTS.filter((a) => a.type === "D" || a.type === "A").map((a) => (
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
                            {CHART_OF_ACCOUNTS.filter((a) => a.type === "R" || a.type === "A").map((a) => (
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
      )}
    </div>
  );
}
