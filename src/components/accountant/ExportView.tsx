import type { Client } from "@/data/store";
import { resolveAccounts } from "@/data/chartOfAccounts";
import { Download, Lightbulb, ArrowLeft } from "lucide-react";

interface Props {
  client: Client;
  onBack: () => void;
}

export default function ExportView({ client, onBack }: Props) {
  const txs = client.transactions.filter((t) => t.approved && t.category);

  const lines = txs.map((tx) => {
    const dateParts = tx.date.split("-");
    const dateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const complement = tx.description.slice(0, 30);
    const value = tx.amount.toFixed(2);

    const { debit, credit } = resolveAccounts(tx.category, tx.type, client.bank);

    return [dateStr, tx.category, complement, value, debit, credit, "1", "N", "", ""].join("\t");
  });

  const fileContent = lines.join("\n");
  const clientCode = client.id.toUpperCase();
  const filename = `contasflow_${clientCode}_mar2026.txt`;

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 cf-stagger">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button className="cf-btn-ghost text-sm mb-2 flex items-center gap-1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h2 className="text-2xl font-bold">Exportação Domínio</h2>
          <p className="text-muted-foreground text-sm mt-1">{client.name} · {txs.length} lançamentos</p>
        </div>
        <button className="cf-btn-primary flex items-center gap-2" onClick={handleDownload}>
          <Download className="w-4 h-4" /> Baixar {filename}
        </button>
      </div>

      {/* Preview */}
      <div className="cf-card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Preview do arquivo</h3>
          <span className="text-xs text-muted-foreground">{filename}</span>
        </div>
        <div className="overflow-x-auto p-4">
          <pre className="text-xs font-mono text-foreground leading-relaxed">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-muted-foreground w-8 shrink-0 text-right mr-4 select-none">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* RPA notice */}
      <div className="cf-card border-cf-blue/30 bg-cf-blue/5 flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-cf-blue shrink-0 mt-0.5" />
        <p className="text-cf-blue text-sm">
          Em breve: importação automática via RPA direto no Domínio Sistemas, sem download manual.
        </p>
      </div>
    </div>
  );
}
