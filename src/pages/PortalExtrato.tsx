import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  loadBankTransactions,
  loadAccountingEntries,
  loadAccountingSplits,
  saveAccountingEntries,
  saveAccountingSplits,
  type BankTransaction,
  type AccountingEntry,
  type AccountingSplit,
} from "@/data/models";
import { CATEGORIES } from "@/data/store";
import { resolveAccounts } from "@/data/chartOfAccounts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Filter } from "lucide-react";

type FilterType = "all" | "pendente" | "classificado";

export default function PortalExtrato() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const data = useMemo(() => {
    const txs = loadBankTransactions();
    const entries = loadAccountingEntries();
    const splits = loadAccountingSplits();

    return txs.map((bt) => {
      const entry = entries.find((e) => e.bank_transaction_id === bt.id);
      const split = entry
        ? splits.find((s) => s.accounting_entry_id === entry.id)
        : undefined;
      return { bt, entry, split };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (filter === "all") return data;
    return data.filter((d) => d.entry?.status === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const total = data.length;
    const pending = data.filter((d) => d.entry?.status === "pendente").length;
    const classified = total - pending;
    return { total, pending, classified };
  }, [data]);

  const handleClassify = (
    entry: AccountingEntry | undefined,
    split: AccountingSplit | undefined,
    bt: BankTransaction,
    category: string
  ) => {
    if (!entry || !split) return;

    const entries = loadAccountingEntries();
    const splits = loadAccountingSplits();

    const eIdx = entries.findIndex((e) => e.id === entry.id);
    if (eIdx >= 0) {
      entries[eIdx].status = "classificado";
      saveAccountingEntries(entries);
    }

    const sIdx = splits.findIndex((s) => s.id === split.id);
    if (sIdx >= 0) {
      const txType = bt.type === "Entrada" ? "credit" : "debit";
      const accounts = resolveAccounts(category, txType as "credit" | "debit", bt.bank);
      splits[sIdx].history = category + " - " + bt.description_full;
      splits[sIdx].debit_account = accounts.debit;
      splits[sIdx].credit_account = accounts.credit;
      saveAccountingSplits(splits);
    }

    setRefreshKey((k) => k + 1);
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
              <h1 className="text-xl font-bold font-heading">Portal do Cliente — Extrato</h1>
              <p className="text-xs text-muted-foreground">
                {counts.total} transações · {counts.classified} classificadas · {counts.pending} pendentes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="classificado">Classificados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Faça upload de extratos na tela de Envios para ver transações aqui.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36 text-right">Valor</TableHead>
                  <TableHead className="w-36 text-right">Saldo</TableHead>
                  <TableHead className="w-52">Classificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ bt, entry, split }) => {
                  const isEntrada = bt.type === "Entrada";
                  const currentCategory = split?.history?.split(" - ")[0] || "";
                  const isPending = entry?.status === "pendente";

                  return (
                    <TableRow key={bt.id} className={isPending ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm font-mono">
                        {bt.date.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isEntrada ? "default" : "destructive"}
                          className={
                            isEntrada
                              ? "bg-[hsl(var(--cf-green))]/15 text-[hsl(var(--cf-green))] border-[hsl(var(--cf-green))]/30"
                              : "bg-[hsl(var(--cf-red))]/15 text-[hsl(var(--cf-red))] border-[hsl(var(--cf-red))]/30"
                          }
                        >
                          {bt.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={bt.description_full}>
                        {bt.description_full}
                      </TableCell>
                      <TableCell
                        className={`text-sm text-right font-mono font-medium ${
                          isEntrada ? "text-[hsl(var(--cf-green))]" : "text-[hsl(var(--cf-red))]"
                        }`}
                      >
                        {isEntrada ? "+" : "-"} {formatCurrency(bt.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {bt.balance != null ? formatCurrency(bt.balance) : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={isPending ? "" : currentCategory}
                          onValueChange={(cat) => handleClassify(entry, split, bt, cat)}
                        >
                          <SelectTrigger
                            className={`h-8 text-xs ${isPending ? "border-destructive/40 text-destructive" : ""}`}
                          >
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
