import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, FileCode2, Loader2, RefreshCw, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { api, isTerminal, type JobDetail, type LogEntry, type PipelineStep } from "@/lib/api";
import { useEvents, useJob, useRule } from "@/lib/queries";
import { durationBetween, formatDuration, formatTime } from "@/lib/format";
import { PageHeader, ErrorState, EmptyState, JsonBlock, Mono, MockBadge, CopyButton } from "@/components/soc/primitives";
import { StatusBadge, StatusIcon, statusStyle } from "@/components/soc/status";
import { RulePanel } from "@/components/soc/RulePanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const TABS = ["pipeline", "logs", "traces", "rule", "metadata"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/jobs/$jobId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({ tab: TABS.includes(s.tab as Tab) ? (s.tab as Tab) : undefined }),
  head: ({ params }) => ({
    meta: [
      { title: `Job ${params.jobId} — SigmaForge` },
      { name: "description", content: "Inspect pipeline steps, logs, AI traces and the generated Sigma rule for a CVE job." },
      { property: "og:title", content: `Job ${params.jobId} — SigmaForge` },
      { property: "og:description", content: "Job detail workbench." },
    ],
  }),
  component: JobWorkbench,
});

function JobWorkbench() {
  const { jobId } = Route.useParams();
  const { tab = "pipeline" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: job, isLoading, error, refetch, isFetching } = useJob(jobId);
  const qc = useQueryClient();

  const cancel = useMutation({
    mutationFn: () => api().cancelJob(jobId),
    onSuccess: () => { toast.success("Cancellation requested"); qc.invalidateQueries({ queryKey: ["job"] }); },
    onError: (e: Error) => toast.error("Cancel failed", { description: e.message }),
  });
  const retry = useMutation({
    mutationFn: () => api().retryJob(jobId),
    onSuccess: ({ jobId: id }) => { toast.success("Retry submitted", { description: id }); navigate({ to: "/jobs/$jobId", params: { jobId: id } }); },
    onError: (e: Error) => toast.error("Retry failed", { description: e.message }),
  });

  if (error) return <><PageHeader title="Job" crumbs={[{ label: "CVE Pipeline", to: "/pipeline" }, { label: jobId }]} /><ErrorState error={error} onRetry={() => refetch()} /></>;
  if (isLoading || !job) return <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-10 w-96" /><Skeleton className="h-96" /></div>;

  const dur = durationBetween(job.startedAt, job.endedAt);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "CVE Pipeline", to: "/pipeline" }, { label: job.cveId }, { label: job.id }]}
        title={<span className="flex flex-wrap items-center gap-3"><Mono copy className="text-xl font-semibold">{job.cveId}</Mono><StatusBadge status={job.status} /><MockBadge /></span>}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="flex items-center gap-1">job <Mono copy>{job.id}</Mono></span>
            <span>started {formatTime(job.startedAt)}</span>
            <span>duration {formatDuration(dur)}{!job.endedAt && " (live)"}</span>
            {!isTerminal(job.status) && <span className="flex items-center gap-1 text-warning"><Loader2 className="h-3 w-3 animate-spin" />polling</span>}
          </span>
        }
        actions={<>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />Refresh</Button>
          {job.capabilities?.retry && <Button variant="outline" size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}><RotateCcw className="h-3.5 w-3.5" />Retry</Button>}
          {job.capabilities?.cancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-danger hover:text-danger"><Square className="h-3.5 w-3.5" />Cancel</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel job {job.id}?</AlertDialogTitle>
                  <AlertDialogDescription>The backend will stop processing {job.cveId}. Partial outputs may remain; no rule will be produced.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep running</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel job</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {job.ruleId && <Button size="sm" onClick={() => navigate({ search: { tab: "rule" } })}><FileCode2 className="h-3.5 w-3.5" />View rule</Button>}
        </>}
      />

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab }, replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="traces">AI Traces</TabsTrigger>
          <TabsTrigger value="rule" disabled={!job.ruleId}>Generated Rule</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline"><PipelineView steps={job.steps} /></TabsContent>
        <TabsContent value="logs"><LogsView job={job} /></TabsContent>
        <TabsContent value="traces"><TracesTab job={job} /></TabsContent>
        <TabsContent value="rule">{job.ruleId && <RuleTab ruleId={job.ruleId} />}</TabsContent>
        <TabsContent value="metadata"><div className="panel p-4"><JsonBlock value={{ ...job, steps: undefined, metadata: job.metadata }} maxH="max-h-[600px]" /></div></TabsContent>
      </Tabs>
    </>
  );
}

function PipelineView({ steps }: { steps: PipelineStep[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(steps.filter((s) => s.status === "failed" || s.status === "running").map((s) => s.id)));
  if (steps.length === 0) return <div className="panel"><EmptyState title="No steps reported" description="The backend has not returned any pipeline steps for this job yet." /></div>;
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <ol className="relative space-y-2" aria-label="Execution pipeline">
      {steps.map((s, i) => {
        const isOpen = open.has(s.id);
        const style = statusStyle(s.status);
        return (
          <li key={s.id} className="relative pl-9">
            {i < steps.length - 1 && <span className="absolute left-[13px] top-8 h-[calc(100%-12px)] w-px bg-border" aria-hidden />}
            <span className={cn("absolute left-0 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border bg-background", style.cls)}><StatusIcon status={s.status} className="h-3.5 w-3.5" /></span>
            <div className={cn("panel", s.status === "failed" && "border-danger/40", s.status === "running" && "border-warning/40")}>
              <button type="button" onClick={() => toggle(s.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left">
                <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("text-sm font-medium", (s.status === "pending" || s.status === "skipped") && "text-muted-foreground")}>{s.name}</span>
                <StatusBadge status={s.status} />
                <span className="ml-auto flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
                  <span className="hidden sm:inline">{s.startedAt ? formatTime(s.startedAt) : "—"} → {s.endedAt ? formatTime(s.endedAt).split(", ")[1] : s.status === "running" ? "…" : "—"}</span>
                  <span className="w-14 text-right tabular-nums text-foreground">{formatDuration(s.durationMs ?? (s.status === "running" ? durationBetween(s.startedAt) : undefined))}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t px-3 py-3">
                  {s.error && (
                    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-xs">
                      <p className="font-medium text-danger">{s.error.code ? `${s.error.code}: ` : ""}{s.error.message}</p>
                      {s.error.detail && <p className="mt-1 font-mono text-muted-foreground">{s.error.detail}</p>}
                    </div>
                  )}
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div><p className="label-caps mb-1.5">Input</p><JsonBlock value={s.input} maxH="max-h-48" /></div>
                    <div><p className="label-caps mb-1.5">Output</p><JsonBlock value={s.output} maxH="max-h-48" /></div>
                  </div>
                  <div><p className="label-caps mb-1.5">Logs</p><LogLines logs={s.logs} /></div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const LEVEL_CLS: Record<string, string> = { error: "text-danger", warn: "text-warning", info: "text-info", debug: "text-muted-foreground" };
function LogLines({ logs }: { logs?: LogEntry[] }) {
  if (!logs?.length) return <p className="text-xs italic text-muted-foreground">No logs</p>;
  const text = logs.map((l) => `${l.ts} ${l.level.toUpperCase()} ${l.step ? `[${l.step}] ` : ""}${l.message}`).join("\n");
  return (
    <div className="relative rounded-md border bg-background">
      <CopyButton value={text} className="absolute right-1.5 top-1.5" label="Copy logs" />
      <pre className="max-h-80 overflow-auto p-3 pr-9 font-mono text-[11.5px] leading-relaxed">
        {logs.map((l, i) => (
          <div key={i}><span className="text-muted-foreground">{l.ts.slice(11, 23)}</span> <span className={cn("inline-block w-12 uppercase", LEVEL_CLS[l.level])}>{l.level}</span> {l.step && <span className="text-primary">[{l.step}] </span>}{l.message}</div>
        ))}
      </pre>
    </div>
  );
}

function LogsView({ job }: { job: JobDetail }) {
  const [level, setLevel] = useState<string>("all");
  const logs = job.steps.flatMap((s) => s.logs ?? []).filter((l) => level === "all" || l.level === level).sort((a, b) => a.ts.localeCompare(b.ts));
  return (
    <div className="panel p-3">
      <div className="mb-3 flex gap-1" role="group" aria-label="Filter log level">
        {["all", "info", "warn", "error", "debug"].map((l) => (
          <button key={l} onClick={() => setLevel(l)} aria-pressed={level === l} className={cn("rounded px-2 py-1 text-xs capitalize", level === l ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>
      <LogLines logs={logs} />
    </div>
  );
}

function TracesTab({ job }: { job: JobDetail }) {
  const ex = job.executionIds[0];
  const { data, isLoading, error, refetch } = useEvents(ex);
  if (!ex) return <div className="panel"><EmptyState title="No AI execution linked" /></div>;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  return (
    <div className="panel">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm">Execution <Mono copy>{ex}</Mono> · {data?.length ?? "…"} events</span>
        <Link to="/traces" search={{ execution: ex }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Open in Trace Explorer<ExternalLink className="h-3 w-3" /></Link>
      </div>
      <ul className="divide-y divide-border/60">
        {isLoading && <li className="p-3"><Skeleton className="h-24" /></li>}
        {data?.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-3 py-2 text-xs">
            <span className="w-20 shrink-0 font-mono text-muted-foreground">{e.ts.slice(11, 19)}</span>
            <span className="w-28 shrink-0 font-mono text-primary">{e.type}</span>
            <span className="min-w-0 truncate">{e.title}{e.toolName && <span className="text-muted-foreground"> · {e.toolName}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleTab({ ruleId }: { ruleId: string }) {
  const { data, isLoading, error, refetch } = useRule(ruleId);
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-96" />;
  return <RulePanel rule={data} />;
}
