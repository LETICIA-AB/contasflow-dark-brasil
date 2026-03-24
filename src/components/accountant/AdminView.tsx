import { useState } from "react";
import { type Client, type User, type Upload, loadUsers, saveUsers, loadUploads, loadClients, saveClients, formatCNPJ } from "@/data/store";
import { loadBanks, saveBanks, addBank, type BankEntry } from "@/data/bankStore";

interface Props {
  clients: Client[];
  onUpdate: () => void;
}

export default function AdminView({ clients, onUpdate }: Props) {
  const [subTab, setSubTab] = useState<"users" | "clients" | "uploads" | "banks">("users");
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [uploads] = useState<Upload[]>(loadUploads);
  const [editing, setEditing] = useState<string | null>(null);
  const [formCnpj, setFormCnpj] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClientId, setFormClientId] = useState("");
  
  const [banks, setBanks] = useState<BankEntry[]>(loadBanks);
  const [newBankName, setNewBankName] = useState("");
  const [newBankCode, setNewBankCode] = useState("");

  // Client (Empresa) form state
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [clientFormName, setClientFormName] = useState("");
  const [clientFormCnpj, setClientFormCnpj] = useState("");
  const [clientFormRegime, setClientFormRegime] = useState("Simples Nacional");
  const [clientFormBank, setClientFormBank] = useState("");
  const [clientFormBanks, setClientFormBanks] = useState<string[]>([]);

  const refreshUsers = () => setUsers(loadUsers());

  const startCreate = () => {
    setEditing("new");
    setFormCnpj("");
    setFormPassword("");
    setFormClientId("");
  };

  const startEdit = (u: User) => {
    setEditing(u.id);
    setFormCnpj(u.cnpj);
    setFormPassword(u.password);
    setFormClientId(u.clientId);
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
    if (c) { setFormCnpj(c.cnpj); }
  };

  // === Client CRUD ===
  const startCreateClient = () => {
    setEditingClient("new");
    setClientFormName("");
    setClientFormCnpj("");
    setClientFormRegime("Simples Nacional");
    setClientFormBank("");
    setClientFormBanks([]);
  };

  const startEditClient = (c: Client) => {
    setEditingClient(c.id);
    setClientFormName(c.name);
    setClientFormCnpj(c.cnpj);
    setClientFormRegime(c.regime);
    setClientFormBank(c.bank);
    setClientFormBanks(c.banks);
  };

  const handleSaveClient = () => {
    const allClients = loadClients();
    const cnpjClean = clientFormCnpj.replace(/\D/g, "");
    const duplicate = allClients.find(
      (c) => c.cnpj.replace(/\D/g, "") === cnpjClean && c.id !== editingClient
    );
    if (duplicate) {
      alert(`CNPJ já cadastrado para a empresa "${duplicate.name}".`);
      return;
    }
    if (editingClient === "new") {
      const newClient: Client = {
        id: `c-${Date.now()}`,
        name: clientFormName.trim(),
        cnpj: clientFormCnpj,
        regime: clientFormRegime,
        bank: clientFormBank || clientFormBanks[0] || "",
        banks: clientFormBanks,
        chartOverrides: {},
        status: "classify",
        transactions: [],
      };
      allClients.push(newClient);
    } else {
      const c = allClients.find((x) => x.id === editingClient);
      if (c) {
        c.name = clientFormName.trim();
        c.cnpj = clientFormCnpj;
        c.regime = clientFormRegime;
        c.bank = clientFormBank || clientFormBanks[0] || "";
        c.banks = clientFormBanks;
      }
    }
    saveClients(allClients);
    setEditingClient(null);
    onUpdate();
  };

  const deleteClient = (clientId: string) => {
    if (!window.confirm("Excluir esta empresa e todos os dados associados?")) return;
    const allClients = loadClients().filter((c) => c.id !== clientId);
    saveClients(allClients);
    // Also remove associated users
    const allUsers = loadUsers().filter((u) => u.clientId !== clientId);
    saveUsers(allUsers);
    refreshUsers();
    onUpdate();
  };

  const toggleClientBank = (name: string) => {
    setClientFormBanks((prev) => prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]);
  };

  const tabs = [
    { id: "users", label: "Usuários" },
    { id: "clients", label: "Empresas" },
    { id: "uploads", label: "Extratos" },
    { id: "banks", label: "Bancos" },
  ] as const;

  const handleResetData = () => {
    if (!window.confirm("Tem certeza? Isso vai apagar TODOS os dados (empresas, usuários, extratos, bancos, memória) e recarregar a página.")) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cf-v3-")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Administração</h2>
        <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors" onClick={handleResetData}>
          Resetar Dados
        </button>
      </div>

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

      {/* ── CLIENTS (EMPRESAS) ── */}
      {subTab === "clients" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="cf-btn-primary" onClick={startCreateClient}>+ Nova empresa</button>
          </div>

          {editingClient && (
            <div className="cf-card space-y-4 border-primary/30">
              <h3 className="font-semibold">{editingClient === "new" ? "Nova empresa" : "Editar empresa"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Nome da empresa</label>
                  <input className="cf-input" value={clientFormName} onChange={(e) => setClientFormName(e.target.value)} placeholder="Ex: Restaurante Bom Sabor Ltda" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">CNPJ</label>
                  <input className="cf-input" value={clientFormCnpj} onChange={(e) => setClientFormCnpj(formatCNPJ(e.target.value))} maxLength={18} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Regime tributário</label>
                  <select className="cf-select" value={clientFormRegime} onChange={(e) => setClientFormRegime(e.target.value)}>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Banco principal</label>
                <select className="cf-select" value={clientFormBank} onChange={(e) => setClientFormBank(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {banks.filter((b) => b.active).map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Bancos utilizados</label>
                <div className="flex flex-wrap gap-2">
                  {banks.filter((b) => b.active).map((b) => (
                    <label key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${clientFormBanks.includes(b.name) ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                      <input type="checkbox" className="sr-only" checked={clientFormBanks.includes(b.name)} onChange={() => toggleClientBank(b.name)} />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="cf-btn-primary" onClick={handleSaveClient} disabled={!clientFormName.trim() || !clientFormCnpj}>Salvar</button>
                <button className="cf-btn-secondary" onClick={() => setEditingClient(null)}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CNPJ</th>
                    <th>Regime</th>
                    <th>Bancos</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="font-heading">{c.cnpj}</td>
                      <td className="text-sm">{c.regime}</td>
                      <td className="text-xs text-muted-foreground">{c.banks?.join(", ") || "—"}</td>
                      <td>
                        {c.status === "approved" && <span className="cf-badge-green">Aprovado</span>}
                        {c.status === "review" && <span className="cf-badge-yellow">Em revisão</span>}
                        {c.status === "classify" && <span className="cf-badge-blue">Classificar</span>}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => startEditClient(c)}>Editar</button>
                          <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => deleteClient(c.id)}>Excluir</button>
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
    </div>
  );
}
