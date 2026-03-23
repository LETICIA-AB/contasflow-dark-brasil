import { useState, useRef } from "react";
import type { Client, Upload } from "@/data/store";
import { loadUploads, saveUploads } from "@/data/store";

interface Props {
  client: Client;
}

export default function UploadsView({ client }: Props) {
  const [uploads, setUploads] = useState<Upload[]>(() => loadUploads().filter((u) => u.clientId === client.id));
  const [period, setPeriod] = useState("Mar/2026");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const periods = ["Out/2025", "Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026"];
  const accepted = [".ofx", ".csv", ".txt", ".pdf"];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);

    setTimeout(() => {
      const allUploads = loadUploads();
      const newUploads: Upload[] = Array.from(files).map((f, i) => ({
        id: `up-${Date.now()}-${i}`,
        clientId: client.id,
        filename: f.name,
        bank: client.bank.split(" ")[0],
        size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
        date: new Date().toLocaleString("pt-BR"),
        period,
        status: "processado" as const,
      }));
      const updated = [...allUploads, ...newUploads];
      saveUploads(updated);
      setUploads(updated.filter((u) => u.clientId === client.id));
      setProcessing(false);
    }, 1500);
  };

  const statusBadge = (s: string) => {
    if (s === "processado") return <span className="cf-badge-green">✓ Processado</span>;
    if (s === "aguardando") return <span className="cf-badge-yellow">⏳ Aguardando</span>;
    return <span className="cf-badge-red">✗ Erro</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Extratos Bancários</h2>
        <p className="text-muted-foreground text-sm mt-1">Envie seus extratos para o escritório</p>
      </div>

      {/* Period selector */}
      <div className="cf-card">
        <label className="block text-sm font-medium text-muted-foreground mb-2">Período de referência</label>
        <select className="cf-select max-w-xs" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        className={`cf-card border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-12 ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={accepted.join(",")}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Processando extrato...</p>
          </div>
        ) : (
          <>
            <p className="text-3xl mb-3">📁</p>
            <p className="text-foreground font-medium">Arraste seu extrato aqui</p>
            <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar · OFX, CSV, TXT, PDF (máx 10 MB)</p>
          </>
        )}
      </div>

      {/* Upload history */}
      {uploads.length > 0 && (
        <div className="cf-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Histórico de envios</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Banco</th>
                  <th>Tamanho</th>
                  <th>Data/Hora</th>
                  <th>Período</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.filename}</td>
                    <td>{u.bank}</td>
                    <td className="text-muted-foreground">{u.size}</td>
                    <td className="text-muted-foreground">{u.date}</td>
                    <td>{u.period}</td>
                    <td>{statusBadge(u.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
