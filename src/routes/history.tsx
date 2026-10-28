import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { HistoryQuery } from "@/lib/api";
import { useHistory } from "@/lib/queries";
import { PageHeader, ErrorState, EmptyState, MockBadge, Mono } from "@/components/soc/primitives";
import { StatusBadge } from "@/components/soc/status";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { durationBetween, formatDuration, formatTime } from "@/lib/format";

type Search = Partial<Omit<HistoryQuery, "pageSize">>;

export const Route = createFileRoute("/history")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const str = (k: string) => (typeof s[k] === "string" && s[k] ? (s[k] as string) : undefined);
    const outcome = str("outcome");
    return {
      cveId: str("cveId"), status: str("status"), from: str("from"), to: str("to"), executionId: str("executionId"),
      outcome: outcome === "rule" || outcome === "no_rule" ? outcome : undefined,
      page: Number(s.page) > 0 ? Number(s.page) : undefined,
    };
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Processing History — SigmaForge" },
      { name: "description", content: "Search past CVE processing jobs by status, date, outcome and execution." },
      { property: "og:title", content: "Processing History — SigmaForge" },
      { property: "og:description", content: "Search past CVE processing jobs." },
    ],
  }),
  component: HistoryPage,
});

const PAGE_SIZE = 15;

function HistoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const page = search.page ?? 1;
  const { data, isLoading, isFetching, error, refetch } = useHistory({ ...search, page, pageSize: PAGE_SIZE });
  const [cve, setCve] = useState(search.cveId ?? "");
  const [exec, setExec] = useState(search.executionId ?? "");

  // Debounce text filters into the URL so state survives navigation.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.cveId ?? "") !== cve || (search.executionId ?? "") !== exec)
        navigate({ search: (p) => ({ ...p, cveId: cve || undefined, executionId: exec || undefined, page: undefined }), replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [cve, exec]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Search) => navigate({ search: (p) => ({ ...p, ...patch, page: undefined }), replace: true });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const selectCls = "h-8 rounded-md border bg-background px-2 text-xs";

  return (
    <>
      <PageHeader title={<span className="flex items-center gap-2">Processing History <MockBadge /></span>} description="All CVE jobs. Filters are kept in the URL." />
      <div className="panel">
        <div className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_130px_130px_130px_auto]">
          <Input aria-label="CVE ID" value={cve} onChange={(e) => setCve(e.target.value)} placeholder="CVE ID" className="h-8 font-mono text-xs" />
          <Input aria-label="Execution ID" value={exec} onChange={(e) => setExec(e.target.value)} placeholder="Execution ID" className="h-8 font-mono text-xs" />
          <select aria-label="Status" value={search.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })} className={selectCls}>
            <option value="">Any status</option>{["queued", "running", "completed", "failed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Rule outcome" value={search.outcome ?? ""} onChange={(e) => set({ outcome: (e.target.value || undefined) as Search["outcome"] })} className={selectCls}>
            <option value="">Any outcome</option><option value="rule">Rule generated</option><option value="no_rule">No rule</option>
          </select>
          <Input aria-label="From date" type="date" value={search.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className="h-8 text-xs" />
          <Input aria-label="To date" type="date" value={search.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className="h-8 text-xs" />
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setCve(""); setExec(""); navigate({ search: {} }); }}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
        </div>
        {error ? <div className="p-3"><ErrorState error={error} onRetry={() => refetch()} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">{["CVE ID", "Workflow ID", "Execution", "Status", "Rule", "Started", "Duration", ""].map((h) => <th key={h} className="label-caps whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
              <tbody className={isFetching && !isLoading ? "opacity-60" : ""}>
                {isLoading && Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-3 py-2.5"><Skeleton className="h-5" /></td></tr>)}
                {data?.items.map((j) => (
                  <tr key={j.id} className="border-b border-border/60 hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3 py-2"><Mono copy>{j.cveId}</Mono></td>
                    <td className="whitespace-nowrap px-3 py-2"><Mono className="text-muted-foreground">{j.id}</Mono></td>
                    <td className="whitespace-nowrap px-3 py-2">{j.executionIds[0] ? <Mono copy className="text-muted-foreground">{j.executionIds[0]}</Mono> : "—"}</td>
                    <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                    <td className="px-3 py-2">{j.ruleId ? <Link to="/rules/$ruleId" params={{ ruleId: j.ruleId }} className="text-xs text-primary hover:underline">View rule</Link> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{formatTime(j.startedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{formatDuration(durationBetween(j.startedAt, j.endedAt))}</td>
                    <td className="px-3 py-2 text-right"><Link to="/jobs/$jobId" params={{ jobId: j.id }} className="text-xs font-medium text-primary hover:underline">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data?.items.length === 0 && <EmptyState title="No jobs match these filters" />}
          </div>
        )}
        <div className="flex items-center justify-between border-t p-3 text-xs text-muted-foreground">
          <span className="font-mono">{data ? `${data.total} results · page ${page}/${pages}` : "…"}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 }) })}><ChevronLeft className="h-3.5 w-3.5" />Prev</Button>
            <Button variant="outline" size="sm" className="h-7" disabled={page >= pages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })}>Next<ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </>
  );
}
