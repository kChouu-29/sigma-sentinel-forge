import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertOctagon, ArrowUpRight, CheckCircle2, Cpu, Database, FileCode2, Plus, Search, ShieldCheck, GitPullRequest, Send } from "lucide-react";
import { useOverview, useRules } from "@/lib/queries";
import { PageHeader, ErrorState, EmptyState, MockBadge, Mono } from "@/components/soc/primitives";
import { JobsTable } from "@/components/soc/JobsTable";
import { RuleStateBadge } from "@/components/soc/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { relTime } from "@/lib/format";
import { MAX_ROWS, latestCveWorkflows, latestRules, countRuleStates, ruleStateLabel } from "@/lib/soc-display";
import type { RuleState } from "@/lib/api";

const RULE_METRICS: { state: RuleState; Icon: typeof FileCode2; tone: string; border: string; background: string }[] = [
  { state: "generated", Icon: FileCode2, tone: "text-info", border: "border-t-info", background: "bg-info/10" },
  { state: "validated", Icon: ShieldCheck, tone: "text-primary", border: "border-t-primary", background: "bg-primary/10" },
  { state: "reviewed", Icon: GitPullRequest, tone: "text-warning", border: "border-t-warning", background: "bg-warning/10" },
  { state: "deployed", Icon: Send, tone: "text-success", border: "border-t-success", background: "bg-success/10" },
];

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
  const activity = useMemo(() => data ? latestRules(data.recentRules) : undefined, [data]);
  const ruleCounts = useMemo(() => countRuleStates(rules.data ?? []), [rules.data]);

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2">Overview <MockBadge /></span>}
        description="CVE operations & detection rules"
        actions={<Button asChild><Link to="/pipeline"><Plus className="h-4 w-4" />New CVE</Link></Button>}
      />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : (
        <div className="space-y-7">
          <section aria-label="Operations summary" className="grid grid-cols-2 gap-y-5 border-y py-5 lg:grid-cols-4">
            {isLoading || !data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mx-4 h-16" />) : [
              { label: "CVEs processed", value: data.totals.processed, Icon: Database, tone: "text-foreground" },
              { label: "Running workflows", value: data.totals.running, Icon: Cpu, tone: "text-warning" },
              { label: "Rules generated", value: data.totals.rulesGenerated, Icon: CheckCircle2, tone: "text-primary" },
              { label: "Failed workflows", value: data.totals.failed, Icon: AlertOctagon, tone: "text-danger" },
            ].map(({ label, value, Icon, tone }) => (
              <div key={label} className="min-w-0 border-l px-4 first:border-l-0 lg:px-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} />{label}</div>
                <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </section>

          <section aria-label="Rule status summary" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Rule status</h2>
              <Link to="/rules" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">All rules<ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </div>
            {rules.error ? <ErrorState error={rules.error} onRetry={() => rules.refetch()} /> : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {rules.isLoading || !rules.data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-lg" />) : RULE_METRICS.map(({ state, Icon, tone, border, background }) => (
                  <div key={state} className={`panel border-t-2 p-4 ${border}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium capitalize text-muted-foreground">{ruleStateLabel(state)}</span>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${background} ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
                    </div>
                    <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{ruleCounts[state]}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <section className="min-w-0 space-y-3" aria-label="Recent jobs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><h2 className="text-sm font-semibold">Latest CVEs</h2><span className="font-mono text-xs text-muted-foreground">{data ? latestCveWorkflows(data.recentJobs).length : "…"}/{MAX_ROWS}</span></div>
                <div className="relative w-full max-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input aria-label="Search jobs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by CVE, workflow, stage…" className="h-8 pl-8 text-xs" />
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border"><JobsTable jobs={jobs} loading={isLoading} /></div>
              {jobs && jobs.length === 0 && <EmptyState title="No matching jobs" description="Try a different search term." />}
            </section>

            <section className="min-w-0 space-y-3" aria-label="Recent rule activity">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><h2 className="text-sm font-semibold">Rule activity</h2><span className="font-mono text-xs text-muted-foreground">{activity ? activity.length : "…"}/{MAX_ROWS}</span></div>
                <Link to="/rules" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">All rules<ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
              <ul className="panel max-h-[540px] divide-y overflow-y-auto">
                {isLoading && Array.from({ length: 6 }).map((_, i) => <li key={i} className="px-3 py-2.5"><Skeleton className="h-9" /></li>)}
                {activity?.map((r) => (
                  <li key={r.id}>
                    <Link to="/rules/$ruleId" params={{ ruleId: r.id }} className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/40">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary"><FileCode2 className="h-3 w-3" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <Mono className="font-medium">{r.cveId}</Mono>
                          <RuleStateBadge state={r.state} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{r.fields.title}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{relTime(r.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
                {activity && activity.length === 0 && <EmptyState title="No rules yet" />}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
