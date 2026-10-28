import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Search, XCircle } from "lucide-react";
import { useRules } from "@/lib/queries";
import { PageHeader, ErrorState, EmptyState, MockBadge, Mono } from "@/components/soc/primitives";
import { RuleStateBadge } from "@/components/soc/status";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { groupRulesByCve } from "@/lib/soc-display";

export const Route = createFileRoute("/rules/")({
  head: () => ({
    meta: [
      { title: "Sigma Rules — SigmaForge" },
      { name: "description", content: "Browse AI-generated Sigma rules with validation and lifecycle state." },
      { property: "og:title", content: "Sigma Rules — SigmaForge" },
      { property: "og:description", content: "Browse AI-generated Sigma rules with validation and lifecycle state." },
    ],
  }),
  component: RulesList,
});

const STATES = ["", "generated", "validated", "reviewed", "deployed"];

function RulesList() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const { data, isLoading, error, refetch } = useRules(q || undefined, state || undefined);
  const groups = useMemo(() => groupRulesByCve(data ?? []), [data]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (cveId: string) => setCollapsed((previous) => {
    const next = new Set(previous);
    if (next.has(cveId)) next.delete(cveId); else next.add(cveId);
    return next;
  });
  return (
    <>
      <PageHeader title={<span className="flex items-center gap-2">Sigma Rules <MockBadge /></span>} description="Generated rules are not production-ready until validated, reviewed and deployed." />
      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input aria-label="Search rules" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search CVE, title, rule ID…" className="h-8 pl-8 text-xs" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by state">
            {STATES.map((s) => (
              <Button key={s || "all"} size="sm" variant="ghost" onClick={() => setState(s)} aria-pressed={state === s} className={cn("h-7 px-2 text-xs capitalize", state === s ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>{s || "all"}</Button>
            ))}
          </div>
        </div>
        {error ? <div className="p-3"><ErrorState error={error} onRetry={() => refetch()} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">{["Rule ID", "Title", "Workflow ID", "Level", "State", "Validation", "Created", ""].map((h) => <th key={h} className="label-caps whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-3 py-2.5"><Skeleton className="h-5" /></td></tr>)}
              </tbody>
              {groups.map((group) => (
                <tbody key={group.cveId} aria-label={`Rules for ${group.cveId}`}>
                  <tr className="border-b bg-muted/40">
                    <td colSpan={8} className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="h-7 gap-2 px-1" aria-label={`Toggle rules for ${group.cveId}`} aria-expanded={!collapsed.has(group.cveId)} onClick={() => toggle(group.cveId)}>
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", collapsed.has(group.cveId) && "-rotate-90")} />
                          <span className="font-mono text-xs font-semibold">{group.cveId}</span>
                        </Button>
                        <span className="font-mono text-xs text-muted-foreground">{group.rules.length} {group.rules.length === 1 ? "rule" : "rules"}</span>
                      </div>
                    </td>
                  </tr>
                {!collapsed.has(group.cveId) && group.rules.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3 py-2"><Mono copy>{r.id}</Mono></td>
                    <td className="min-w-48 max-w-md whitespace-normal break-words px-3 py-2">{r.fields.title ?? "Untitled rule"}</td>
                    <td className="whitespace-nowrap px-3 py-2"><Link to="/jobs/$jobId" params={{ jobId: r.jobId }} className="font-mono text-xs text-primary hover:underline">{r.jobId}</Link></td>
                    <td className="px-3 py-2 text-xs capitalize text-warning">{r.fields.level ?? "—"}</td>
                    <td className="px-3 py-2"><RuleStateBadge state={r.state} /></td>
                    <td className="px-3 py-2">{r.validation ? (r.validation.valid ? <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Passed</span> : <span className="inline-flex items-center gap-1 text-xs text-danger"><XCircle className="h-3.5 w-3.5" />Failed</span>) : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{formatTime(r.createdAt)}</td>
                    <td className="px-3 py-2 text-right"><Link to="/rules/$ruleId" params={{ ruleId: r.id }} className="text-xs font-medium text-primary hover:underline">Open</Link></td>
                  </tr>
                ))}
                </tbody>
              ))}
            </table>
            {data?.length === 0 && <EmptyState title="No rules found" description="Adjust filters or generate a rule from the CVE Pipeline." />}
          </div>
        )}
      </div>
    </>
  );
}
