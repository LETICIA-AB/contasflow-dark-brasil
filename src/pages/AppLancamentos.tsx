import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadBankTransactions,
  loadAccountingEntries,
  loadAccountingSplits,
  saveAccountingSplits,
  saveAccountingEntries,
  type BankTransaction,
  type AccountingEntry,
  type AccountingSplit,
} from "@/data/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Split, CheckCircle2, Clock, BookOpen } from "lucide-react";
import SplitModal from "@/components/accountant/SplitModal";

interface RowData {
  bt: BankTransaction;
  entry: AccountingEntry;
  splits: AccountingSplit[];
}

export default function AppLancamentos() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [splitTarget, setSplitTarget] = useState<RowData | null>(null);

  const rows = useMemo(() => {
    const txs = loadBankTransactions();
    const entries = loadAccountingEntries();
    const splits = loadAccountingSplits();

    return txs.map((bt) => {
      const entry = entries.find((e) => e.bank_transaction_id === bt.id);
      const entrySplits = entry
        ? splits.filter((s) => s.accounting_entry_id === entry.id)
        : [];
      return { bt, entry: entry!, splits: entrySplits };
    }).filter((r) => r.entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const counts = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.entry.status === "pendente").length;
    const classified = rows.filter((r) => r.entry.status === "classificado").length;
    const booked = rows.filter((r) => r.entry.status === "contabilizado").length;
    return { total, pending, classified, booked };
  }, [rows]);

  const handleSplitSave = (
    row: RowData,
    newSplits: Omit<AccountingSplit, "id" | "accounting_entry_id">[]
  ) => {
    const allSplits = loadAccountingSplits();
    // Remove existing splits for this entry
    const filtered = allSplits.filter((s) => s.accounting_entry_id !== row.entry.id);
    // Add new ones
    const created = newSplits.map((ns, i) => ({
      ...ns,
      id: `as-${Date.now()}-${i}`,
      accounting_entry_id: row.entry.id,
    }));
    saveAccountingSplits([...filtered, ...created]);

    // Mark as contabilizado if all splits have accounts
    if (created.every((s) => s.debit_account && s.credit_account)) {
      const entries = loadAccountingEntries();
      const idx = entries.findIndex((e) => e.id === row.entry.id);
      if (idx >= 0) {
        entries[idx].status = "contabilizado";
        saveAccountingEntries(entries);
      }
    }

    setRefreshKey((k) => k + 1);
  };

  const statusBadge = (status: AccountingEntry["status"]) => {
    const map = {
      pendente: { icon: Clock, label: "Pendente", cls: "bg-[hsl(var(--cf-yellow))]/15 text-[hsl(var(--cf-yellow))] border-[hsl(var(--cf-yellow))]/30" },
      classificado: { icon: CheckCircle2, label: "Classificado", cls: "bg-[hsl(var(--cf-blue))]/15 text-[hsl(var(--cf-blue))] border-[hsl(var(--cf-blue))]/30" },
      contabilizado: { icon: BookOpen, label: "Contabilizado", cls: "bg-[hsl(var(--cf-green))]/15 text-[hsl(var(--cf-green))] border-[hsl(var(--cf-green))]/30" },
    };
    const cfg = map[status];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={cfg.cls}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg.label}
      </Badge>
    );
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold font-heading">Painel do Contador — Lançamentos</h1>
              <p className="text-xs text-muted-foreground">
                {counts.total} lançamentos · {counts.booked} contabilizados · {counts.classified} classificados · {counts.pending} pendentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
            <p className="text-sm mt-1">Importe extratos para gerar lançamentos contábeis.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead className="w-32">Nº Documento</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="w-36 text-right">Valor</TableHead>
                  <TableHead className="w-32">Débito</TableHead>
                  <TableHead className="w-32">Crédito</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const mainSplit = row.splits[0];
                  const hasSplits = row.splits.length > 1;

                  return (
                    <React.Fragment key={row.bt.id}>
                      <TableRow>
                        <TableCell className="text-sm font-mono">
                          {row.bt.date.split("-").reverse().join("/")}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {row.entry.document_number}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" title={mainSplit?.history}>
                          {mainSplit?.history || row.bt.description_full}
                          {hasSplits && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({row.splits.length} linhas)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono font-medium">
                          {formatCurrency(row.entry.original_amount)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {mainSplit?.debit_account || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {mainSplit?.credit_account || "—"}
                        </TableCell>
                        <TableCell>{statusBadge(row.entry.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSplitTarget(row)}
                          >
                            <Split className="w-3 h-3 mr-1" />
                            Desmembrar
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Show extra split lines */}
                      {hasSplits &&
                        row.splits.slice(1).map((sp) => (
                          <TableRow key={sp.id} className="bg-muted/10">
                            <TableCell />
                            <TableCell />
                            <TableCell className="text-xs text-muted-foreground pl-8">
                              ↳ {sp.history}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {formatCurrency(sp.amount)}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {sp.debit_account || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {sp.credit_account || "—"}
                            </TableCell>
                            <TableCell />
                            <TableCell />
                          </TableRow>
                        ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Split Modal */}
      {splitTarget && splitTarget.splits[0] && (
        <SplitModal
          open
          onClose={() => setSplitTarget(null)}
          originalAmount={splitTarget.entry.original_amount}
          currentSplit={splitTarget.splits[0]}
          onSave={(newSplits) => handleSplitSave(splitTarget, newSplits)}
        />
      )}
    </div>
  );
}
