import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertOctagon, CheckCircle2, Cpu, Database, FileCode2, Plus, Search, ShieldCheck, GitPullRequest } from "lucide-react";
import { useOverview, useRules } from "@/lib/queries";
import { PageHeader, StatCard, ErrorState, EmptyState, MockBadge, Mono } from "@/components/soc/primitives";
import { JobsTable } from "@/components/soc/JobsTable";
import { RuleStateBadge } from "@/components/soc/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { relTime } from "@/lib/format";
import { MAX_ROWS, latestCveWorkflows, countRuleStates } from "@/lib/soc-display";

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
  const rules = useRules();
  const [q, setQ] = useState("");
  const jobs = useMemo(() => data ? latestCveWorkflows(data.recentJobs).filter((j) => (j.cveId + j.id + (j.stage ?? "") + j.status).toLowerCase().includes(q.toLowerCase())) : undefined, [data, q]);
  const ruleCounts = useMemo(() => countRuleStates(rules.data ?? []), [rules.data]);

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
              <StatCard label="Rules generated" value={data.totals.rulesGenerated} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" hint="Generated ≠ published" />
              <StatCard label="Failed jobs" value={data.totals.failed} icon={<AlertOctagon className="h-4 w-4" />} tone="danger" />
            </>}
          </div>

          <section aria-label="Rule status summary" className="space-y-3">
            <h2 className="text-sm font-semibold">Rule status</h2>
            {rules.error ? <ErrorState error={rules.error} onRetry={() => rules.refetch()} /> : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {rules.isLoading || !rules.data ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-lg" />) : <>
                  <StatCard label="Generated" value={ruleCounts.generated} icon={<FileCode2 className="h-4 w-4" />} />
                  <StatCard label="Validated" value={ruleCounts.validated} icon={<ShieldCheck className="h-4 w-4" />} tone="success" />
                  <StatCard label="Reviewed" value={ruleCounts.reviewed} icon={<GitPullRequest className="h-4 w-4" />} tone="warning" />
                </>}
              </div>
            )}
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
                {data?.recentRules.slice(0, MAX_ROWS).map((r) => (
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
