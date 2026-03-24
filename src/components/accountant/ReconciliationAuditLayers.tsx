import { useState } from "react";
import {
  ArrowDownToLine,
  Cpu,
  Brain,
  UserPen,
  Check,
  Minus,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { AuditLayerData, AuditLayerStatus } from "@/data/store";
import { buildAuditLayers } from "@/data/auditEngine";
import type { Transaction } from "@/data/store";

// ── Status config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  AuditLayerStatus,
  { label: string; icon: typeof Check; colorClass: string; dotClass: string; lineClass: string }
> = {
  pass: {
    label: "Concluído",
    icon: Check,
    colorClass: "text-cf-green",
    dotClass: "bg-cf-green border-cf-green shadow-[0_0_8px_hsl(163_100%_38%/0.4)]",
    lineClass: "bg-cf-green/40",
  },
  skip: {
    label: "Ignorado",
    icon: Minus,
    colorClass: "text-muted-foreground",
    dotClass: "bg-muted border-border",
    lineClass: "bg-border",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    colorClass: "text-cf-yellow",
    dotClass: "bg-cf-yellow/20 border-cf-yellow",
    lineClass: "bg-cf-yellow/30",
  },
  override: {
    label: "Substituído",
    icon: RefreshCw,
    colorClass: "text-cf-purple",
    dotClass: "bg-cf-purple/20 border-cf-purple",
    lineClass: "bg-cf-purple/40",
  },
};

// ── Layer icon config ────────────────────────────────────────────────
const LAYER_ICONS: Record<AuditLayerData["layer"], typeof ArrowDownToLine> = {
  input: ArrowDownToLine,
  automation: Cpu,
  ai_suggestion: Brain,
  client_description: UserPen,
};

// ── Layer badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AuditLayerStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const badgeClass: Record<AuditLayerStatus, string> = {
    pass: "cf-badge-green",
    skip: "bg-secondary text-muted-foreground border border-border",
    pending: "cf-badge-yellow",
    override: "cf-badge-purple",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${badgeClass[status]}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── Single layer panel ───────────────────────────────────────────────
function AuditLayerPanel({ layer, isLast }: { layer: AuditLayerData; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[layer.status];
  const StatusIcon = cfg.icon;
  const LayerIcon = LAYER_ICONS[layer.layer];
  const hasDetails = Object.keys(layer.details).length > 0;

  return (
    <div className="flex gap-3">
      {/* Vertical track */}
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${cfg.dotClass}`}
        >
          <StatusIcon className={`w-3 h-3 ${cfg.colorClass}`} />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[24px] mt-1 transition-colors ${cfg.lineClass}`} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 ${isLast ? "" : ""} flex-1 min-w-0`}>
        <button
          className="w-full text-left group"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          disabled={!hasDetails}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <LayerIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold">{layer.label}</span>
            <span className="text-xs text-muted-foreground">{layer.sublabel}</span>
            <StatusBadge status={layer.status} />
            {hasDetails && (
              <span className={`ml-auto text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}>
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
        </button>

        {expanded && hasDetails && (
          <div className="mt-2 rounded-lg bg-secondary/40 border border-border/50 divide-y divide-border/30 text-xs animate-fade-in">
            {Object.entries(layer.details).map(([key, value]) => (
              <div key={key} className="flex gap-2 px-3 py-1.5">
                <span className="text-muted-foreground shrink-0 w-32">{key}</span>
                <span className="font-medium break-all">{String(value ?? "—")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary bar (compact horizontal view) ────────────────────────────
function AuditSummaryBar({ layers }: { layers: AuditLayerData[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {layers.map((layer, i) => {
        const cfg = STATUS_CONFIG[layer.status];
        const LayerIcon = LAYER_ICONS[layer.layer];
        return (
          <div key={layer.layer} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium
                ${layer.status === "pass" ? "border-cf-green/30 bg-cf-green/10 text-cf-green" : ""}
                ${layer.status === "skip" ? "border-border bg-secondary text-muted-foreground" : ""}
                ${layer.status === "pending" ? "border-cf-yellow/30 bg-cf-yellow/10 text-cf-yellow" : ""}
                ${layer.status === "override" ? "border-cf-purple/30 bg-cf-purple/10 text-cf-purple" : ""}
              `}
            >
              <LayerIcon className="w-2.5 h-2.5" />
              {layer.label}
            </div>
            {i < layers.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export: full audit timeline ────────────────────────────────
interface Props {
  transaction: Transaction;
  defaultExpanded?: boolean;
}

export default function ReconciliationAuditLayers({ transaction, defaultExpanded = false }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const layers = buildAuditLayers(transaction);

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 overflow-hidden">
      {/* Header / toggle */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Brain className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">
          Auditoria de Conciliação
        </span>
        <div className="flex-1 overflow-hidden">
          {!open && <AuditSummaryBar layers={layers} />}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded layers */}
      {open && (
        <div className="px-3 pt-3 pb-1 border-t border-border/40 animate-fade-in">
          {layers.map((layer, i) => (
            <AuditLayerPanel key={layer.layer} layer={layer} isLast={i === layers.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aggregated panel for a full batch (used in review dashboard) ─────
export function AuditLayersSummaryCard({ transactions }: { transactions: Transaction[] }) {
  const allLayers = transactions.map((tx) => buildAuditLayers(tx));

  const stats = {
    input: transactions.length,
    automationPass: allLayers.filter((ls) => ls[1].status === "pass").length,
    automationSkip: allLayers.filter((ls) => ls[1].status === "skip").length,
    aiPass: allLayers.filter((ls) => ls[2].status === "pass").length,
    aiOverride: allLayers.filter((ls) => ls[2].status === "override").length,
    aiPending: allLayers.filter((ls) => ls[2].status === "pending").length,
    clientPass: allLayers.filter((ls) => ls[3].status === "pass").length,
    clientPending: allLayers.filter((ls) => ls[3].status === "pending").length,
  };

  const layers: { icon: typeof ArrowDownToLine; label: string; sublabel: string; items: { label: string; value: number; color: string }[] }[] = [
    {
      icon: ArrowDownToLine,
      label: "Input",
      sublabel: "Extrato bancário",
      items: [{ label: "Transações recebidas", value: stats.input, color: "text-cf-green" }],
    },
    {
      icon: Cpu,
      label: "Automação",
      sublabel: "Motor de regras",
      items: [
        { label: "Regras aplicadas", value: stats.automationPass, color: "text-cf-green" },
        { label: "Sem correspondência", value: stats.automationSkip, color: "text-muted-foreground" },
      ],
    },
    {
      icon: Brain,
      label: "Sugestão IA",
      sublabel: "Memória e confiança",
      items: [
        { label: "Sugestões aceitas", value: stats.aiPass, color: "text-cf-green" },
        { label: "Substituídas", value: stats.aiOverride, color: "text-cf-purple" },
        { label: "Sem sugestão", value: stats.aiPending, color: "text-cf-yellow" },
      ],
    },
    {
      icon: UserPen,
      label: "Descrição do Cliente",
      sublabel: "Classificação manual",
      items: [
        { label: "Classificadas", value: stats.clientPass, color: "text-cf-blue" },
        { label: "Pendentes", value: stats.clientPending, color: "text-cf-yellow" },
      ],
    },
  ];

  return (
    <div className="cf-card">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-muted-foreground" />
        Auditoria de Conciliação — 4 Camadas
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
        {layers.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <div key={i} className="bg-card p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none">{layer.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{layer.sublabel}</p>
                </div>
              </div>
              <div className="space-y-1">
                {layer.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground truncate">{item.label}</span>
                    <span className={`text-sm font-bold font-heading tabular-nums ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
