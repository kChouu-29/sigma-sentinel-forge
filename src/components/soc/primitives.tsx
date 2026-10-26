import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check, ChevronRight, Copy, Inbox, RefreshCw, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import { useApiConfig } from "@/lib/queries";

export function PageHeader({ title, description, crumbs, actions }: {
  title: ReactNode; description?: ReactNode; crumbs?: { label: string; to?: string }[]; actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {c.to ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label}: ${value.slice(0, 40)}`}
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setDone(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setDone(false), 1200);
      }}
      className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", className)}
    >
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function Mono({ children, copy, className }: { children: string; copy?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[0.8rem]", className)}>
      {children}
      {copy && <CopyButton value={children} />}
    </span>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error as Error;
  const kind = e instanceof ApiError ? e.kind : undefined;
  return (
    <div role="alert" className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-danger" />
      <div>
        <p className="font-medium">{kind === "timeout" ? "Request timed out" : kind === "network" ? "Backend unreachable" : "Failed to load data"}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{e?.message ?? String(error)}</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" />Retry</Button>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function MockBadge() {
  const { mode } = useApiConfig();
  if (mode !== "mock") return null;
  return (
    <span title="Data on this page comes from the built-in mock adapter, not a real backend" className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-warning">
      <FlaskConical className="h-3 w-3" />Mock data
    </span>
  );
}

export function JsonBlock({ value, maxH = "max-h-72" }: { value: unknown; maxH?: string }) {
  if (value === undefined || value === null) return <p className="text-xs italic text-muted-foreground">Not provided by backend</p>;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <CopyButton value={text} className="absolute right-1.5 top-1.5" />
      <pre className={cn("overflow-auto rounded-md border bg-background p-3 pr-9 font-mono text-xs leading-relaxed text-foreground/90", maxH)}>{text}</pre>
    </div>
  );
}

export function StatCard({ label, value, icon, tone = "default", hint }: { label: string; value: ReactNode; icon: ReactNode; tone?: "default" | "warning" | "success" | "danger"; hint?: string }) {
  const toneCls = { default: "text-primary", warning: "text-warning", success: "text-success", danger: "text-danger" }[tone];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        <span className={toneCls}>{icon}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
