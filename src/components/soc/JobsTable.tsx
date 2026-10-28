import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Job } from "@/lib/api";
import { durationBetween, formatDuration, formatTime } from "@/lib/format";
import { Mono } from "./primitives";
import { StatusBadge } from "./status";
import { Skeleton } from "@/components/ui/skeleton";

export function JobsTable({ jobs, loading }: { jobs?: Job[]; loading?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            {["CVE ID", "Workflow ID", "Stage", "Status", "Progress", "Started", "Duration", ""].map((h) => (
              <th key={h} className="label-caps whitespace-nowrap px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b"><td colSpan={8} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td></tr>
          ))}
          {jobs?.map((j) => (
            <tr key={j.id} className="border-b border-border/60 transition-colors hover:bg-accent/40">
              <td className="whitespace-nowrap px-3 py-2"><Mono copy className="font-medium text-foreground">{j.cveId}</Mono></td>
              <td className="whitespace-nowrap px-3 py-2"><Mono copy className="text-muted-foreground">{j.id}</Mono></td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{j.stage ?? "—"}</td>
              <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
              <td className="px-3 py-2"><ProgressBar value={j.progress} status={j.status} /></td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{formatTime(j.startedAt)}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums">{formatDuration(durationBetween(j.startedAt, j.endedAt))}</td>
              <td className="px-3 py-2 text-right">
                <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                  Inspect<ArrowUpRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
