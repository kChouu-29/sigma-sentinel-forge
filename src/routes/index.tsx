import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertOctagon, CheckCircle2, Cpu, Database, Plus, Search } from "lucide-react";
import { useOverview } from "@/lib/queries";
import { PageHeader, StatCard, ErrorState, EmptyState, MockBadge, Mono } from "@/components/soc/primitives";
import { JobsTable } from "@/components/soc/JobsTable";
import { RuleStateBadge, StatusIcon } from "@/components/soc/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { relTime } from "@/lib/format";
import { latestCveWorkflows } from "@/lib/soc-display";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Overview — SigmaForge" },
      { name: "description", content: "Operational overview of CVE processing jobs and Sigma rule generation." },
      { property: "og:title", content: "Overview — SigmaForge" },
      { property: "og:description", content: "Operational overview of CVE processing jobs and Sigma rule generation." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data, isLoading, error, refetch } = useOverview();
  const [q, setQ] = useState("");
  const jobs = useMemo(() => data ? latestCveWorkflows(data.recentJobs).filter((j) => (j.cveId + j.id + (j.stage ?? "") + j.status).toLowerCase().includes(q.toLowerCase())) : undefined, [data, q]);
  const total = data ? data.stageSummary.reduce((a, b) => a + b.count, 0) : 0;

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2">Overview <MockBadge /></span>}
        description="Pipeline activity across CVE ingestion, AI generation and validation."
        actions={<Button asChild><Link to="/pipeline"><Plus className="h-4 w-4" />New CVE job</Link></Button>}
      />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {isLoading || !data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-lg" />) : <>
              <StatCard label="CVEs processed" value={data.totals.processed} icon={<Database className="h-4 w-4" />} />
              <StatCard label="Running jobs" value={data.totals.running} icon={<Cpu className="h-4 w-4" />} tone="warning" />
              <StatCard label="Rules generated" value={data.totals.rulesGenerated} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" hint="Generated ≠ deployed" />
              <StatCard label="Failed jobs" value={data.totals.failed} icon={<AlertOctagon className="h-4 w-4" />} tone="danger" />
            </>}
          </div>

          <section className="panel p-4" aria-label="Pipeline status summary">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pipeline status</h2>
              <span className="font-mono text-xs text-muted-foreground">{total} jobs</span>
            </div>
            {data ? (
              <>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {data.stageSummary.map((s) => s.count > 0 && (
                    <div key={s.label} title={`${s.label}: ${s.count}`} style={{ width: `${(s.count / total) * 100}%` }}
                      className={{ queued: "bg-info", running: "bg-warning", completed: "bg-success", failed: "bg-danger" }[s.status as string] ?? "bg-muted-foreground"} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  {data.stageSummary.map((s) => (
                    <Link key={s.label} to="/history" search={{ status: s.status }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <StatusIcon status={s.status} className="h-3.5 w-3.5" /><span className="capitalize">{s.label}</span><span className="font-mono text-foreground">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : <Skeleton className="h-10" />}
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            <section className="panel min-w-0" aria-label="Recent jobs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <h2 className="text-sm font-semibold">Latest CVEs <span className="ml-1 font-mono text-xs text-muted-foreground">{data ? latestCveWorkflows(data.recentJobs).length : "…"}/10</span></h2>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input aria-label="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by CVE, workflow, stage…" className="h-8 pl-8 text-xs" />
                </div>
              </div>
              <JobsTable jobs={jobs} loading={isLoading} />
              {jobs && jobs.length === 0 && <EmptyState title="No matching jobs" description="Try a different search term." />}
            </section>

            <section className="panel" aria-label="Recent rule activity">
              <div className="flex items-center justify-between border-b p-3">
                <h2 className="text-sm font-semibold">Rule activity</h2>
                <Link to="/rules" className="text-xs text-primary hover:underline">All rules</Link>
              </div>
              <ul className="divide-y divide-border/60">
                {isLoading && Array.from({ length: 5 }).map((_, i) => <li key={i} className="p-3"><Skeleton className="h-9" /></li>)}
                {data?.recentRules.map((r) => (
                  <li key={r.id}>
                    <Link to="/rules/$ruleId" params={{ ruleId: r.id }} className="block p-3 hover:bg-accent/40">
                      <div className="flex items-center justify-between gap-2">
                        <Mono className="font-medium">{r.cveId}</Mono>
                        <RuleStateBadge state={r.state} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{r.fields.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{relTime(r.createdAt)}</p>
                    </Link>
                  </li>
                ))}
                {data && data.recentRules.length === 0 && <EmptyState title="No rules yet" />}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
