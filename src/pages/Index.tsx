import { useState, useCallback } from "react";
import { loadClients, type Session, type Client } from "@/data/store";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import UploadsView from "@/components/client/UploadsView";
import ClassifyView from "@/components/client/ClassifyView";
import DashboardView from "@/components/client/DashboardView";
import ClientListView from "@/components/accountant/ClientListView";
import AdminView from "@/components/accountant/AdminView";
import ReviewView from "@/components/accountant/ReviewView";
import ExportView from "@/components/accountant/ExportView";
import RulesView from "@/components/accountant/RulesView";
import AccountsView from "@/components/accountant/AccountsView";

export default function Index() {
  const [session, setSession] = useState<Session>(null);
  const [view, setView] = useState("uploads");
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [reviewClientId, setReviewClientId] = useState<string | null>(null);
  const [exportClientId, setExportClientId] = useState<string | null>(null);

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
  };

  if (!session) return <Login onLogin={handleLogin} />;

  const currentClient = session.type === "client"
    ? clients.find((c) => c.id === session.clientId) ?? null
    : null;

  // Accountant review/export views
  if (session.type === "accountant" && exportClientId) {
    const expClient = clients.find((c) => c.id === exportClientId);
    if (expClient) {
      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar session={session} client={null} activeView="clients" onNavigate={(v) => { setExportClientId(null); setReviewClientId(null); setView(v); }} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <ExportView client={expClient} onBack={() => setExportClientId(null)} />
          </main>
        </div>
      );
    }
  }

  if (session.type === "accountant" && reviewClientId) {
    const revClient = clients.find((c) => c.id === reviewClientId);
    if (revClient) {
      return (
        <div className="flex h-screen overflow-hidden">
          <Sidebar session={session} client={null} activeView="clients" onNavigate={(v) => { setReviewClientId(null); setView(v); }} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <ReviewView client={revClient} onUpdate={refresh} onExport={(id) => setExportClientId(id)} />
          </main>
        </div>
      );
    }
  }

  const renderView = () => {
    if (session.type === "client" && currentClient) {
      switch (view) {
        case "uploads": return <UploadsView client={currentClient} />;
        case "classify": return <ClassifyView client={currentClient} onUpdate={refresh} />;
        case "dashboard": return <DashboardView client={currentClient} />;
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
      <Sidebar session={session} client={currentClient} activeView={view} onNavigate={setView} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {renderView()}
      </main>
    </div>
  );
}
