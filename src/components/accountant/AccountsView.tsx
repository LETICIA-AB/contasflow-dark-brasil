import { useState } from "react";
import { CHART_OF_ACCOUNTS } from "@/data/chartOfAccounts";

export default function AccountsView() {
  const [filterGroup, setFilterGroup] = useState("all");
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Plano de Contas</h2>
        <p className="text-muted-foreground text-sm mt-1">{CHART_OF_ACCOUNTS.length} contas · Padrão Domínio Sistemas</p>
      </div>

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
    </div>
  );
}
