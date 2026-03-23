import { useState } from "react";
import { type Client, type User, type Upload, loadUsers, saveUsers, loadUploads, loadClients, formatCNPJ } from "@/data/store";

interface Props {
  clients: Client[];
  onUpdate: () => void;
}

export default function AdminView({ clients, onUpdate }: Props) {
  const [subTab, setSubTab] = useState<"users" | "uploads">("users");
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [uploads] = useState<Upload[]>(loadUploads);
  const [editing, setEditing] = useState<string | null>(null);
  const [formCnpj, setFormCnpj] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClientId, setFormClientId] = useState("");

  const refreshUsers = () => { const u = loadUsers(); setUsers(u); };

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
      const newUser: User = {
        id: `u-${Date.now()}`,
        cnpj: formCnpj,
        password: formPassword,
        clientId: formClientId,
        active: true,
        lastLogin: null,
      };
      allUsers.push(newUser);
    } else {
      const u = allUsers.find((x) => x.id === editing);
      if (u) {
        u.cnpj = formCnpj;
        u.password = formPassword;
        u.clientId = formClientId;
      }
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
    const allUsers = loadUsers().filter((u) => u.id !== userId);
    saveUsers(allUsers);
    refreshUsers();
  };

  const clientName = (cid: string) => clients.find((c) => c.id === cid)?.name ?? "—";

  // Auto-fill CNPJ when client selected
  const handleClientSelect = (cid: string) => {
    setFormClientId(cid);
    const c = clients.find((cl) => cl.id === cid);
    if (c) setFormCnpj(c.cnpj);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Administração</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-card rounded-lg border border-border p-1 w-fit">
        <button
          onClick={() => setSubTab("users")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Usuários
        </button>
        <button
          onClick={() => setSubTab("uploads")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${subTab === "uploads" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Extratos recebidos
        </button>
      </div>

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
              {formClientId && formCnpj && formPassword && (
                <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Preview de login:</p>
                  <p className="font-heading">CNPJ: <span className="text-primary">{formCnpj}</span> · Senha: <span className="text-primary">{formPassword}</span></p>
                </div>
              )}
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
                    <th>Senha</th>
                    <th>Último acesso</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-heading">{u.cnpj}</td>
                      <td>{clientName(u.clientId)}</td>
                      <td className="text-muted-foreground">••••••</td>
                      <td className="text-muted-foreground text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("pt-BR") : "Nunca"}</td>
                      <td>{u.active ? <span className="cf-badge-green">Ativo</span> : <span className="cf-badge-red">Inativo</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => startEdit(u)}>Editar</button>
                          <button className="cf-btn-ghost text-xs py-1 px-2" onClick={() => toggleActive(u.id)}>
                            {u.active ? "Pausar" : "Ativar"}
                          </button>
                          <button className="cf-btn-ghost text-xs py-1 px-2 text-cf-red" onClick={() => deleteUser(u.id)}>Excluir</button>
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

      {subTab === "uploads" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clients.map((c) => {
              const count = uploads.filter((u) => u.clientId === c.id).length;
              return (
                <div key={c.id} className="cf-card">
                  <p className="text-muted-foreground text-xs mb-1">{c.name}</p>
                  <p className="text-2xl font-bold font-heading">{count}</p>
                </div>
              );
            })}
            <div className="cf-card border-primary/30">
              <p className="text-muted-foreground text-xs mb-1">Total</p>
              <p className="text-2xl font-bold font-heading text-primary">{uploads.length}</p>
            </div>
          </div>

          <div className="cf-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="cf-table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Empresa</th>
                    <th>Período</th>
                    <th>Banco</th>
                    <th>Tamanho</th>
                    <th>Data/Hora</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.filename}</td>
                      <td>{clientName(u.clientId)}</td>
                      <td>{u.period}</td>
                      <td>{u.bank}</td>
                      <td className="text-muted-foreground">{u.size}</td>
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
    </div>
  );
}
