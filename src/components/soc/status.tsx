import { Ban, CheckCircle2, CircleDashed, CircleSlash, Clock, Loader2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleState } from "@/lib/api";
import { ruleStateLabel } from "@/lib/soc-display";

const STATUS: Record<string, { cls: string; Icon: typeof Clock; spin?: boolean }> = {
  queued: { cls: "text-info border-info/30 bg-info/10", Icon: Clock },
  pending: { cls: "text-muted-foreground border-border bg-muted", Icon: CircleDashed },
  running: { cls: "text-warning border-warning/30 bg-warning/10", Icon: Loader2, spin: true },
  completed: { cls: "text-success border-success/30 bg-success/10", Icon: CheckCircle2 },
  failed: { cls: "text-danger border-danger/30 bg-danger/10", Icon: XCircle },
  cancelled: { cls: "text-muted-foreground border-border bg-muted", Icon: Ban },
  skipped: { cls: "text-muted-foreground border-border bg-transparent", Icon: CircleSlash },
};

export function statusStyle(s: string) {
  return STATUS[s] ?? { cls: "text-muted-foreground border-border bg-muted", Icon: HelpCircle };
}

export function StatusIcon({ status, className }: { status: string; className?: string }) {
  const { Icon, spin, cls } = statusStyle(status);
  return <Icon aria-hidden className={cn("h-4 w-4 shrink-0", cls.split(" ")[0], spin && "animate-spin", className)} />;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { cls, Icon, spin } = statusStyle(status);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize", cls, className)}>
      <Icon aria-hidden className={cn("h-3 w-3", spin && "animate-spin")} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

const RULE_STATES: RuleState[] = ["generated", "validated", "reviewed", "deployed"];
const RULE_CLS: Record<RuleState, string> = {
  generated: "text-muted-foreground border-border bg-muted",
  validated: "text-info border-info/30 bg-info/10",
  reviewed: "text-primary border-primary/30 bg-primary/10",
  deployed: "text-success border-success/30 bg-success/10",
};

export function RuleStateBadge({ state }: { state: RuleState }) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize", RULE_CLS[state])}>{ruleStateLabel(state)}</span>;
}

/** Lifecycle track — makes explicit that generation ≠ production-ready. */
export function RuleLifecycle({ state }: { state: RuleState }) {
  const idx = RULE_STATES.indexOf(state);
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={`Rule lifecycle: ${ruleStateLabel(state)}`}>
      {RULE_STATES.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-medium capitalize", i <= idx ? RULE_CLS[s] + " border" : "border border-dashed text-muted-foreground/60")}>{ruleStateLabel(s)}</span>
          {i < RULE_STATES.length - 1 && <span className={cn("h-px w-3", i < idx ? "bg-primary" : "bg-border")} />}
        </li>
      ))}
    </ol>
  );
}

