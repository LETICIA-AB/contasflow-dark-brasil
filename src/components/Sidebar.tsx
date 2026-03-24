import type { Session, Client } from "@/data/store";

interface SidebarProps {
  session: Session;
  client: Client | null;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

const clientTabs = [
  { id: "uploads", label: "Extratos", icon: "📄" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "insights", label: "Insights", icon: "💡" },
];

const accountantTabs = [
  { id: "clients", label: "Carteira", icon: "🏢" },
  { id: "rules", label: "Regras IA", icon: "🤖" },
  { id: "accounts", label: "Plano de Contas", icon: "📋" },
  { id: "admin", label: "Admin", icon: "⚙️" },
];

export default function Sidebar({ session, client, activeView, onNavigate, onLogout }: SidebarProps) {
  if (!session) return null;

  const tabs = session.type === "client" ? clientTabs : accountantTabs;
  const title = session.type === "client" ? client?.name ?? "" : "Escritório Contábil";
  const subtitle = session.type === "client" ? client?.cnpj : "Painel do Contador";

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-5 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight">
          <span className="text-primary">Contas</span>
          <span className="text-foreground">Flow</span>
        </h2>
      </div>

      <div className="p-5 border-b border-border">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeView === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <button onClick={onLogout} className="cf-btn-ghost w-full text-sm justify-start">← Sair</button>
      </div>
    </aside>
  );
}
