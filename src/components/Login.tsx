import { useState } from "react";
import { loadUsers, saveUsers, formatCNPJ, type Session } from "@/data/store";

interface LoginProps {
  onLogin: (session: Session) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<"client" | "accountant">("client");
  const [cnpj, setCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "accountant") {
      if (password === "contasflow") {
        onLogin({ type: "accountant" });
      } else {
        setError("Senha do escritório incorreta.");
      }
      return;
    }

    const users = loadUsers();
    const user = users.find((u) => u.cnpj === cnpj && u.password === password);
    if (!user) {
      setError("CNPJ ou senha inválidos.");
      return;
    }
    if (!user.active) {
      setError("Usuário inativo. Contate o escritório.");
      return;
    }
    user.lastLogin = new Date().toISOString();
    saveUsers(users);
    onLogin({ type: "client", clientId: user.clientId, cnpj: user.cnpj });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[400px] rounded-full opacity-30"
          style={{ background: "radial-gradient(ellipse, hsl(165 80% 44% / 0.1), transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, hsl(260 70% 68% / 0.08), transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary-strong)" }}>
            <span className="text-2xl font-black text-primary-foreground font-heading">CF</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-primary">Contas</span>
            <span className="text-foreground">Flow</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm tracking-wide">
            Automação contábil inteligente
          </p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl bg-card border border-border p-1.5 mb-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <button
            onClick={() => { setMode("client"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              mode === "client"
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={mode === "client" ? { background: "var(--gradient-primary)", boxShadow: "0 2px 12px hsl(165 80% 44% / 0.3)" } : {}}
          >
            Portal do Cliente
          </button>
          <button
            onClick={() => { setMode("accountant"); setError(""); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              mode === "accountant"
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={mode === "accountant" ? { background: "var(--gradient-primary)", boxShadow: "0 2px 12px hsl(165 80% 44% / 0.3)" } : {}}
          >
            Painel do Contador
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="cf-card space-y-5 border-border/60" style={{ boxShadow: "var(--shadow-elevated)" }}>
          {mode === "client" && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                CNPJ da empresa
              </label>
              <input
                type="text"
                className="cf-input font-heading tracking-wide text-base"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                maxLength={18}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {mode === "client" ? "Senha" : "Senha do escritório"}
            </label>
            <input
              type="password"
              className="cf-input text-base"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-cf-red/10 border border-cf-red/20">
              <p className="text-cf-red text-sm">{error}</p>
            </div>
          )}

          <button type="submit" className="cf-btn-primary w-full py-3 text-base">
            Entrar
          </button>

        </form>
      </div>
    </div>
  );
}
