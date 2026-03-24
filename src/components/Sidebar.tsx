import { useState } from "react";
import type { Session, Client } from "@/data/store";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  session: Session;
  client: Client | null;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const clientTabs = [
  { id: "uploads", label: "Envios", icon: "📤" },
  { id: "classify", label: "Classificar", icon: "🏷️" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "insights", label: "Insights", icon: "💡" },
];

const accountantTabs = [
  { id: "clients", label: "Carteira", icon: "🏢" },
  { id: "rules", label: "Regras IA", icon: "🤖" },
  { id: "accounts", label: "Plano de Contas", icon: "📋" },
  { id: "admin", label: "Admin", icon: "⚙️" },
];

export default function Sidebar({ session, client, activeView, onNavigate, onLogout, open, onClose }: SidebarProps) {
  if (!session) return null;

  const tabs = session.type === "client" ? clientTabs : accountantTabs;
  const title = session.type === "client" ? client?.name ?? "" : "Escritório Contábil";
  const subtitle = session.type === "client" ? client?.cnpj : "Painel do Contador";

  const handleNav = (view: string) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 border-r border-border/60
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "linear-gradient(180deg, hsl(222 38% 6%) 0%, hsl(222 38% 4.5%) 100%)",
        }}
      >
        {/* Brand */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black text-primary-foreground font-heading"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}
            >
              CF
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              <span className="text-primary">Contas</span>
              <span className="text-foreground">Flow</span>
            </h2>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-border/40">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeView === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
              style={
                activeView === tab.id
                  ? {
                      background: "hsl(165 80% 44% / 0.08)",
                      boxShadow: "inset 3px 0 0 hsl(165 80% 44%)",
                    }
                  : {}
              }
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border/40">
          <button
            onClick={onLogout}
            className="cf-btn-ghost w-full text-sm justify-start opacity-70 hover:opacity-100"
          >
            ← Sair
          </button>
        </div>
      </aside>
    </>
  );
}
