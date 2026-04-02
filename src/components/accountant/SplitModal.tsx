import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import type { AccountingSplit } from "@/data/models";

interface SplitLine {
  history: string;
  amount: string;
  debit_account: string;
  credit_account: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  originalAmount: number;
  currentSplit: AccountingSplit;
  onSave: (splits: Omit<AccountingSplit, "id" | "accounting_entry_id">[]) => void;
}

export default function SplitModal({ open, onClose, originalAmount, currentSplit, onSave }: Props) {
  const [lines, setLines] = useState<SplitLine[]>([
    {
      history: currentSplit.history,
      amount: originalAmount.toFixed(2),
      debit_account: currentSplit.debit_account,
      credit_account: currentSplit.credit_account,
    },
  ]);

  const totalSplit = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const diff = Math.abs(totalSplit - originalAmount);
  const isValid = diff < 0.01 && lines.every((l) => l.history.trim() && parseFloat(l.amount) > 0);

  const addLine = () => {
    const remaining = originalAmount - totalSplit;
    setLines([
      ...lines,
      { history: "", amount: remaining > 0 ? remaining.toFixed(2) : "0.00", debit_account: "", credit_account: "" },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof SplitLine, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave(
      lines.map((l) => ({
        history: l.history,
        amount: parseFloat(l.amount),
        debit_account: l.debit_account,
        credit_account: l.credit_account,
      }))
    );
    onClose();
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Desmembrar Lançamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Valor original: <span className="font-mono font-semibold">{formatCurrency(originalAmount)}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-border bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Linha {idx + 1}</span>
                {lines.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Histórico</Label>
                  <Input
                    value={line.history}
                    onChange={(e) => updateLine(idx, "history", e.target.value)}
                    placeholder="Descrição do lançamento"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.amount}
                    onChange={(e) => updateLine(idx, "amount", e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Conta Débito</Label>
                  <Input
                    value={line.debit_account}
                    onChange={(e) => updateLine(idx, "debit_account", e.target.value)}
                    placeholder="1.1.01.001"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Conta Crédito</Label>
                  <Input
                    value={line.credit_account}
                    onChange={(e) => updateLine(idx, "credit_account", e.target.value)}
                    placeholder="3.1.01.001"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addLine} className="w-full">
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar linha
          </Button>

          {/* Validation */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
            diff < 0.01
              ? "bg-[hsl(var(--cf-green))]/10 text-[hsl(var(--cf-green))]"
              : "bg-destructive/10 text-destructive"
          }`}>
            {diff >= 0.01 && <AlertTriangle className="w-3.5 h-3.5" />}
            Total: {formatCurrency(totalSplit)} / {formatCurrency(originalAmount)}
            {diff >= 0.01 && ` (diferença: ${formatCurrency(diff)})`}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
