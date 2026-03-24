import { useState } from "react";
import type { Session, Client } from "@/data/store";
import { ThemeToggle } from "./ThemeToggle";
import { Upload, CheckCircle, BarChart3, Lightbulb, Building2, LayoutDashboard, Bot, ClipboardList, Settings, LogOut, X } from "lucide-react";
import logoSrc from "@/assets/contasflow-logo.png";

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
  { id: "uploads", label: "Envios", icon: Upload },
  { id: "confirm", label: "Conferir", icon: CheckCircle },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

const accountantTabs = [
  { id: "clients", label: "Carteira", icon: Building2 },
  { id: "panel", label: "Painel Geral", icon: LayoutDashboard },
  { id: "rules", label: "Regras IA", icon: Bot },
  { id: "accounts", label: "Plano de Contas", icon: ClipboardList },
  { id: "admin", label: "Admin", icon: Settings },
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
          background: "var(--sidebar-bg)",
        }}
      >
        {/* Brand */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="ContasFlow" width={36} height={36} className="drop-shadow-md" />
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
            <X className="w-4 h-4" />
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
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="cf-btn-ghost text-sm justify-start opacity-70 hover:opacity-100 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
