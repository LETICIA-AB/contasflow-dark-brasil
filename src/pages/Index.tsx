import { useState, useCallback } from "react";
import { loadClients, type Session, type Client } from "@/data/store";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import UploadsView from "@/components/client/UploadsView";
import ClassifyView from "@/components/client/ClassifyView";
import DashboardView from "@/components/client/DashboardView";
import InsightsView from "@/components/client/InsightsView";
import ClientListView from "@/components/accountant/ClientListView";
import AdminView from "@/components/accountant/AdminView";
import ReviewView from "@/components/accountant/ReviewView";
import ExportView from "@/components/accountant/ExportView";
import RulesView from "@/components/accountant/RulesView";
import AccountsView from "@/components/accountant/AccountsView";

function MobileHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-foreground hover:bg-secondary/60 transition-colors"
        aria-label="Menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-primary-foreground font-heading"
          style={{ background: "var(--gradient-primary)" }}
        >
          CF
        </div>
        <span className="text-sm font-bold">
          <span className="text-primary">Contas</span>
          <span className="text-foreground">Flow</span>
        </span>
      </div>
    </header>
  );
}

export default function Index() {
  const [session, setSession] = useState<Session>(null);
  const [view, setView] = useState("uploads");
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [exportClientId, setExportClientId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refresh = useCallback(() => {
    setClients(loadClients());
  }, []);

  const handleLogin = (s: Session) => {
    setSession(s);
    setView(s?.type === "client" ? "uploads" : "clients");
  };

  const handleLogout = () => {
    setSession(null);
    setView("uploads");
    setReviewClientId(null);
    setExportClientId(null);
    setSidebarOpen(false);
  };

  if (!session) return <Login onLogin={handleLogin} />;

  const currentClient = session.type === "client"
    ? clients.find((c) => c.id === session.clientId) ?? null
    : null;

  const sidebarProps = {
    session,
    client: currentClient,
    activeView: view,
    onLogout: handleLogout,
    open: sidebarOpen,
    onClose: () => setSidebarOpen(false),
  };

  if (session.type === "accountant" && exportClientId) {
    const expClient = clients.find((c) => c.id === exportClientId);
    if (expClient) {
      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar {...sidebarProps} activeView="clients" onNavigate={(v) => { setExportClientId(null); setReviewClientId(null); setView(v); }} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader onToggle={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <ExportView client={expClient} onBack={() => setExportClientId(null)} />
            </main>
          </div>
        </div>
      );
    }
  }

  if (session.type === "accountant" && reviewClientId) {
    const revClient = clients.find((c) => c.id === reviewClientId);
    if (revClient) {
      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar {...sidebarProps} activeView="clients" onNavigate={(v) => { setReviewClientId(null); setView(v); }} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader onToggle={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <ReviewView client={revClient} onUpdate={refresh} onExport={(id) => setExportClientId(id)} />
            </main>
          </div>
        </div>
      );
    }
  }

  const renderView = () => {
    if (session.type === "client" && currentClient) {
      switch (view) {
        case "uploads": return <UploadsView client={currentClient} onUpdate={refresh} />;
        case "classify": return <ClassifyView client={currentClient} onUpdate={refresh} />;
        case "dashboard": return <DashboardView client={currentClient} />;
        case "insights": return <InsightsView client={currentClient} />;
      }
    }
    if (session.type === "accountant") {
      switch (view) {
        case "clients": return <ClientListView clients={clients} onSelectClient={(id) => setReviewClientId(id)} />;
        case "rules": return <RulesView />;
        case "accounts": return <AccountsView />;
        case "admin": return <AdminView clients={clients} onUpdate={refresh} />;
      }
    }
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar {...sidebarProps} onNavigate={setView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
