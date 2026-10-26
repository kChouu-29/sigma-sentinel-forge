import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertOctagon, Bot, CheckSquare, ChevronDown, Flag, Footprints, Loader2, MessageSquare, Search, Send, User, Wrench, X,
} from "lucide-react";
import { api, type Execution, type TraceEvent } from "@/lib/api";
import { useEvents, useExecutions } from "@/lib/queries";
import { formatDuration, formatTime, relTime } from "@/lib/format";
import { PageHeader, ErrorState, EmptyState, JsonBlock, MockBadge, Mono } from "@/components/soc/primitives";
import { StatusBadge, StatusIcon } from "@/components/soc/status";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/traces")({
  validateSearch: (s: Record<string, unknown>): { execution?: string; cve?: string } => ({
    execution: typeof s.execution === "string" ? s.execution : undefined,
    cve: typeof s.cve === "string" ? s.cve : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Traces — SigmaForge" },
      { name: "description", content: "Inspect AI executions, tool calls and persisted conversations behind each Sigma rule." },
      { property: "og:title", content: "AI Traces — SigmaForge" },
      { property: "og:description", content: "Inspect AI executions, tool calls and persisted conversations." },
    ],
  }),
  component: Traces,
});

const TYPE_META: Record<string, { icon: typeof User; label: string; cls: string }> = {
  user_message: { icon: User, label: "User", cls: "text-info" },
  assistant_message: { icon: Bot, label: "Assistant", cls: "text-primary" },
  tool_call: { icon: Wrench, label: "Tool call", cls: "text-foreground" },
  tool_result: { icon: CheckSquare, label: "Tool result", cls: "text-success" },
  step: { icon: Footprints, label: "Step", cls: "text-muted-foreground" },
  validation: { icon: CheckSquare, label: "Validation", cls: "text-info" },
  error: { icon: AlertOctagon, label: "Error", cls: "text-danger" },
  final_output: { icon: Flag, label: "Final output", cls: "text-success" },
};
const typeMeta = (t: string) => TYPE_META[t] ?? { icon: MessageSquare, label: t, cls: "text-muted-foreground" };

function Traces() {
  const { execution, cve } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [listQ, setListQ] = useState("");
  const execs = useExecutions(cve);
  const list = useMemo(() => execs.data?.filter((e) => (e.cveId + e.id + e.jobId).toLowerCase().includes(listQ.toLowerCase())), [execs.data, listQ]);
  const selected = execs.data?.find((e) => e.id === execution);

  useEffect(() => {
    if (!execution && execs.data?.[0]) navigate({ search: (p) => ({ ...p, execution: execs.data![0].id }), replace: true });
  }, [execution, execs.data, navigate]);

  return (
    <>
      <PageHeader title={<span className="flex items-center gap-2">AI Trace Explorer <MockBadge /></span>} description="Persisted AI execution events in chronological order." />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="panel flex max-h-[calc(100vh-170px)] flex-col" aria-label="Executions">
          <div className="space-y-2 border-b p-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input aria-label="Search executions" value={listQ} onChange={(e) => setListQ(e.target.value)} placeholder="CVE or execution ID" className="h-8 pl-8 text-xs" />
            </div>
            {cve && (
              <button onClick={() => navigate({ search: { execution } })} className="flex items-center gap-1 rounded bg-accent px-2 py-0.5 font-mono text-[11px]">
                cve: {cve}<X className="h-3 w-3" />
              </button>
            )}
          </div>
          <ul className="flex-1 overflow-auto">
            {execs.isLoading && Array.from({ length: 8 }).map((_, i) => <li key={i} className="p-2.5"><Skeleton className="h-10" /></li>)}
            {execs.error && <li className="p-2"><ErrorState error={execs.error} onRetry={() => execs.refetch()} /></li>}
            {list?.map((e) => (
              <li key={e.id}>
                <button onClick={() => navigate({ search: (p) => ({ ...p, execution: e.id }) })} aria-current={e.id === execution}
                  className={cn("w-full border-b border-border/50 px-3 py-2 text-left transition-colors", e.id === execution ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "hover:bg-accent/40")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium">{e.cveId}</span>
                    <StatusIcon status={e.status} className="h-3.5 w-3.5" />
                  </div>
                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{e.id}</span><span>{relTime(e.startedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
            {list?.length === 0 && <EmptyState title="No executions" />}
          </ul>
        </aside>
        {execution ? <ExecutionView key={execution} executionId={execution} selected={selected} allExecs={execs.data ?? []} /> : <div className="panel"><EmptyState title="Select an execution" /></div>}
      </div>
    </>
  );
}

function ExecutionView({ executionId, selected, allExecs }: { executionId: string; selected?: Execution; allExecs: Execution[] }) {
  const { data, isLoading, error, refetch } = useEvents(executionId);
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<TraceEvent | null>(null);
  const navigate = useNavigate({ from: Route.fullPath });
  const siblings = selected ? allExecs.filter((e) => e.cveId === selected.cveId) : [];
  const presentTypes = useMemo(() => Array.from(new Set(data?.map((e) => e.type))), [data]);
  const events = useMemo(() => data?.filter((e) =>
    (types.size === 0 || types.has(e.type)) && (!status || e.status === status) &&
    (!q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))
  ), [data, types, status, q]);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_360px]">
      <section className="panel min-w-0" aria-label="Event stream">
        <div className="space-y-2.5 border-b p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Mono copy className="font-medium">{executionId}</Mono>
              {selected && <StatusBadge status={selected.status} />}
              {selected?.model && <span className="font-mono text-[11px] text-muted-foreground">model: {selected.model}</span>}
            </div>
            {selected && (
              <div className="flex gap-3 text-xs">
                <Link to="/jobs/$jobId" params={{ jobId: selected.jobId }} className="text-primary hover:underline">Job</Link>
                {selected.ruleId ? <Link to="/rules/$ruleId" params={{ ruleId: selected.ruleId }} className="text-primary hover:underline">Rule</Link> : <span className="text-muted-foreground">No rule</span>}
              </div>
            )}
          </div>
          {siblings.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="label-caps mr-1">Runs for {selected?.cveId}</span>
              {siblings.map((s) => (
                <button key={s.id} onClick={() => navigate({ search: (p) => ({ ...p, execution: s.id }) })} className={cn("flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]", s.id === executionId ? "border-primary/50 bg-primary/10" : "hover:bg-accent")}>
                  <StatusIcon status={s.status} className="h-3 w-3" />{s.id}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input aria-label="Search events" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages and payloads…" className="h-8 pl-8 text-xs" />
            </div>
            <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
              <option value="">Any status</option><option value="ok">ok</option><option value="error">error</option><option value="pending">pending</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by event type">
            {presentTypes.map((t) => {
              const on = types.has(t); const m = typeMeta(t);
              return (
                <button key={t} aria-pressed={on} onClick={() => setTypes((p) => { const n = new Set(p); on ? n.delete(t) : n.add(t); return n; })}
                  className={cn("flex items-center gap-1 rounded border px-2 py-0.5 text-[11px]", on ? "border-primary/50 bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <m.icon className={cn("h-3 w-3", m.cls)} />{m.label}
                </button>
              );
            })}
          </div>
        </div>
        {error ? <div className="p-3"><ErrorState error={error} onRetry={() => refetch()} /></div> : (
          <ol className="max-h-[calc(100vh-360px)] min-h-64 overflow-auto p-3">
            {isLoading && Array.from({ length: 6 }).map((_, i) => <li key={i} className="mb-2"><Skeleton className="h-14" /></li>)}
            {events?.map((e) => <EventRow key={e.id} e={e} active={active?.id === e.id} onSelect={() => setActive(e)} />)}
            {events?.length === 0 && <EmptyState title={data?.length ? "No events match filters" : "No events recorded"} />}
          </ol>
        )}
      </section>

      <div className="space-y-4">
        <section className="panel" aria-label="Event inspector">
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="text-sm font-semibold">Inspector</h2>
            {active && <button aria-label="Close inspector" onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          {active ? <Inspector e={active} /> : <p className="p-4 text-xs text-muted-foreground">Select an event to inspect its full payload.</p>}
        </section>
        <AnalysisPanel executionId={executionId} />
      </div>
    </div>
  );
}

function EventRow({ e, active, onSelect }: { e: TraceEvent; active: boolean; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  const m = typeMeta(e.type);
  const isMsg = e.type.endsWith("_message");
  return (
    <li className="relative pb-2 pl-7">
      <span className="absolute left-[9px] top-6 h-full w-px bg-border" aria-hidden />
      <span className={cn("absolute left-0 top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-background", m.cls)}><m.icon className="h-3 w-3" /></span>
      <div className={cn("rounded-md border bg-background/40", active && "border-primary/50", e.status === "error" && "border-danger/40")}>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs">
            <span className={cn("font-medium", m.cls)}>{m.label}</span>
            <span className="truncate">{e.title ?? ""}{e.toolName && e.type.startsWith("tool") && <span className="font-mono text-muted-foreground"> {e.toolName}</span>}</span>
          </button>
          {e.durationMs != null && <span className="font-mono text-[10px] text-muted-foreground">{formatDuration(e.durationMs)}</span>}
          <span className="font-mono text-[10px] text-muted-foreground">{e.ts.slice(11, 19)}</span>
          {(e.input !== undefined || e.output !== undefined || e.error || (e.content && !isMsg)) && (
            <button aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground"><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} /></button>
          )}
        </div>
        {isMsg && e.content && <p className="whitespace-pre-wrap border-t border-border/50 px-2.5 py-2 text-xs leading-relaxed">{e.content}</p>}
        {e.error && !open && <p className="border-t border-border/50 px-2.5 py-1.5 text-xs text-danger">{e.error.message}</p>}
        {open && (
          <div className="space-y-2 border-t border-border/50 p-2.5">
            {e.content && !isMsg && <p className="text-xs">{e.content}</p>}
            {e.input !== undefined && <div><p className="label-caps mb-1">Input</p><JsonBlock value={e.input} maxH="max-h-40" /></div>}
            {e.output !== undefined && <div><p className="label-caps mb-1">Output</p><JsonBlock value={e.output} maxH="max-h-40" /></div>}
            {e.error && <div><p className="label-caps mb-1">Error</p><JsonBlock value={e.error} maxH="max-h-40" /></div>}
          </div>
        )}
      </div>
    </li>
  );
}

function Inspector({ e }: { e: TraceEvent }) {
  const rows: [string, string | undefined][] = [
    ["Event ID", e.id], ["Type", e.type], ["Timestamp", formatTime(e.ts)], ["Status", e.status],
    ["Duration", e.durationMs != null ? formatDuration(e.durationMs) : undefined], ["Tool", e.toolName],
  ];
  return (
    <div className="space-y-3 p-3">
      <dl className="space-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[90px_1fr] gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono">{v ?? <span className="text-muted-foreground">—</span>}</dd>
          </div>
        ))}
      </dl>
      {e.content && <div><p className="label-caps mb-1">Content</p><JsonBlock value={e.content} maxH="max-h-48" /></div>}
      <div><p className="label-caps mb-1">Input</p><JsonBlock value={e.input} maxH="max-h-48" /></div>
      <div><p className="label-caps mb-1">Output</p><JsonBlock value={e.output} maxH="max-h-48" /></div>
      {e.error && <div><p className="label-caps mb-1">Error</p><JsonBlock value={e.error} maxH="max-h-48" /></div>}
    </div>
  );
}

function AnalysisPanel({ executionId }: { executionId: string }) {
  const adapter = api();
  const [q, setQ] = useState("");
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const ask = useMutation({
    mutationFn: (question: string) => adapter.analyzeExecution!(executionId, question),
    onSuccess: (r, question) => { setAnswers((p) => [...p, { q: question, a: r.answer }]); setQ(""); },
  });
  return (
    <section className="panel" aria-label="Analyst analysis">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Analyst analysis</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">New questions — separate from the stored conversation above. Not persisted.</p>
      </div>
      {!adapter.analyzeExecution ? (
        <p className="p-4 text-xs text-muted-foreground">No compatible analysis endpoint is configured for this backend.</p>
      ) : (
        <div className="space-y-3 p-3">
          {answers.map((x, i) => (
            <div key={i} className="space-y-1.5 text-xs">
              <p className="rounded-md bg-accent px-2.5 py-1.5">{x.q}</p>
              <p className="whitespace-pre-wrap rounded-md border border-dashed px-2.5 py-1.5 text-muted-foreground">{x.a}</p>
            </div>
          ))}
          {ask.error && <p className="text-xs text-danger">{(ask.error as Error).message}</p>}
          <form onSubmit={(e) => { e.preventDefault(); if (q.trim() && !ask.isPending) ask.mutate(q.trim()); }} className="space-y-2">
            <Textarea aria-label="Ask about this execution" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why did validation fail?" className="min-h-16 text-xs" />
            <Button size="sm" type="submit" disabled={!q.trim() || ask.isPending} className="w-full">
              {ask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Ask
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
