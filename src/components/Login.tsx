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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-primary">Contas</span>
            <span className="text-foreground">Flow</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Automação contábil inteligente
          </p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg bg-card border border-border p-1 mb-8">
          <button
            onClick={() => { setMode("client"); setError(""); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
              mode === "client"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Portal do Cliente
          </button>
          <button
            onClick={() => { setMode("accountant"); setError(""); }}
            className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
              mode === "accountant"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Painel do Contador
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="cf-card space-y-5">
          {mode === "client" && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                CNPJ da empresa
              </label>
              <input
                type="text"
                className="cf-input font-heading tracking-wide"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                maxLength={18}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {mode === "client" ? "Senha" : "Senha do escritório"}
            </label>
            <input
              type="password"
              className="cf-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-cf-red text-sm">{error}</p>
          )}

          <button type="submit" className="cf-btn-primary w-full">
            Entrar
          </button>

          {mode === "client" && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Demo: 12.345.678/0001-90 · hotel123
            </p>
          )}
          {mode === "accountant" && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Demo: contasflow
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
