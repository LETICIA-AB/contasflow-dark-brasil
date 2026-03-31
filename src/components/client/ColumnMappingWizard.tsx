import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface Props {
  headers: string[];
  sampleRows: string[][];
  onConfirm: (mapping: { dateCol: number; descCol: number; amountCol: number; typeCol?: number }) => void;
  onCancel: () => void;
}

export default function ColumnMappingWizard({ headers, sampleRows, onConfirm, onCancel }: Props) {
  const [dateCol, setDateCol] = useState<number | null>(null);
  const [descCol, setDescCol] = useState<number | null>(null);
  const [amountCol, setAmountCol] = useState<number | null>(null);
  const [typeCol, setTypeCol] = useState<number | null>(null);

  const canConfirm = dateCol !== null && descCol !== null && amountCol !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-base">Mapeamento de Colunas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Não reconhecemos o layout. Indique quais colunas correspondem a cada campo.</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h || `Col ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-t border-border/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mapping selects */}
          <div className="grid grid-cols-2 gap-3">
            <MappingSelect label="Data *" value={dateCol} onChange={setDateCol} headers={headers} />
            <MappingSelect label="Descrição *" value={descCol} onChange={setDescCol} headers={headers} />
            <MappingSelect label="Valor *" value={amountCol} onChange={setAmountCol} headers={headers} />
            <MappingSelect label="Tipo (opcional)" value={typeCol} onChange={setTypeCol} headers={headers} optional />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm({ dateCol: dateCol!, descCol: descCol!, amountCol: amountCol!, typeCol: typeCol ?? undefined })}
          >
            Importar com este mapeamento
          </Button>
        </div>
      </div>
    </div>
  );
}

function MappingSelect({ label, value, onChange, headers, optional }: {
  label: string; value: number | null; onChange: (v: number | null) => void; headers: string[]; optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value !== null ? String(value) : ""} onValueChange={v => onChange(v === "" ? null : Number(v))}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value="">Nenhuma</SelectItem>}
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>{h || `Coluna ${i + 1}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
