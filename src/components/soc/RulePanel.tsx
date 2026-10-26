import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Info, ShieldAlert } from "lucide-react";
import type { SigmaRule } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { YamlViewer } from "./YamlViewer";
import { Mono } from "./primitives";
import { RuleLifecycle } from "./status";
import { cn } from "@/lib/utils";

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 py-1.5 text-xs">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function diffLines(a: string, b: string) {
  const al = new Set(a.split("\n"));
  const changed = new Set<number>();
  b.split("\n").forEach((l, i) => { if (!al.has(l)) changed.add(i + 1); });
  return changed;
}

export function RulePanel({ rule }: { rule: SigmaRule }) {
  const versions = rule.versions;
  const [ver, setVer] = useState<number | null>(null);
  const shown = ver != null && versions ? versions.find((v) => v.version === ver)! : null;
  const prev = shown && versions ? versions.find((v) => v.version === shown.version - 1) : undefined;
  const f = rule.fields;
  const v = rule.validation;
  const errors = v?.issues.filter((i) => i.severity === "error").length ?? 0;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-3">
          <div>
            <p className="label-caps mb-1.5">Lifecycle</p>
            <RuleLifecycle state={rule.state} />
          </div>
          {rule.state !== "deployed" && (
            <p className="flex max-w-xs items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              Not deployed. Generated rules require validation and analyst review before production use.
            </p>
          )}
        </div>
        {versions && versions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 text-xs" role="tablist" aria-label="Rule versions">
            <span className="label-caps mr-1">Version</span>
            <button role="tab" aria-selected={ver == null} onClick={() => setVer(null)} className={cn("rounded px-2 py-1", ver == null ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>Latest</button>
            {versions.map((x) => (
              <button key={x.version} role="tab" aria-selected={ver === x.version} onClick={() => setVer(x.version)} className={cn("rounded px-2 py-1 font-mono", ver === x.version ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>v{x.version}</button>
            ))}
            {shown && prev && <span className="ml-2 text-muted-foreground">Highlighted: lines changed vs v{prev.version}</span>}
          </div>
        )}
        <YamlViewer
          yaml={shown?.yaml ?? rule.yaml}
          filename={`${rule.cveId.toLowerCase()}${shown ? `.v${shown.version}` : ""}.yml`}
          highlightLines={shown && prev ? diffLines(prev.yaml, shown.yaml) : undefined}
        />
      </div>

      <aside className="space-y-3">
        <section className="panel p-3" aria-label="Validation">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="label-caps">Validation</h3>
            {v ? (
              <span className={cn("inline-flex items-center gap-1 text-xs font-medium", v.valid ? "text-success" : "text-danger")}>
                {v.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {v.valid ? "Passed" : `${errors} error${errors === 1 ? "" : "s"}`}
              </span>
            ) : <span className="text-xs text-muted-foreground">Not validated</span>}
          </div>
          {v && (
            <>
              <p className="mb-2 font-mono text-[11px] text-muted-foreground">{v.validator} · {formatTime(v.checkedAt)}</p>
              <ul className="space-y-1.5">
                {v.issues.map((i, idx) => (
                  <li key={idx} className="flex gap-2 rounded border bg-background p-2 text-xs">
                    {i.severity === "error" ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger" /> : i.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" /> : <Info className="h-3.5 w-3.5 shrink-0 text-info" />}
                    <span>{i.path && <span className="font-mono text-muted-foreground">{i.path}: </span>}{i.message}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="panel p-3" aria-label="Rule metadata">
          <h3 className="label-caps mb-1">Metadata</h3>
          <dl className="divide-y divide-border/60">
            <Field k="title">{f.title}</Field>
            <Field k="id">{f.id && <Mono copy>{f.id}</Mono>}</Field>
            <Field k="status">{f.status}</Field>
            <Field k="level">{f.level && <span className="font-medium capitalize text-warning">{f.level}</span>}</Field>
            <Field k="author">{f.author}</Field>
            <Field k="date"><span className="font-mono">{f.date}</span></Field>
            <Field k="logsource">{f.logsource && <span className="font-mono">{Object.entries(f.logsource).map(([a, b]) => `${a}: ${b}`).join(" · ")}</span>}</Field>
            <Field k="tags">{f.tags && <div className="flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{t}</span>)}</div>}</Field>
            <Field k="description">{f.description}</Field>
            <Field k="false pos.">{f.falsepositives?.join("; ")}</Field>
            <Field k="references">{f.references?.map((r) => <a key={r} href={r} target="_blank" rel="noreferrer" className="flex items-center gap-1 break-all text-primary hover:underline">{r}<ExternalLink className="h-3 w-3 shrink-0" /></a>)}</Field>
          </dl>
        </section>
        <section className="panel space-y-1 p-3 text-xs">
          <h3 className="label-caps mb-1">Linked</h3>
          <Link to="/jobs/$jobId" params={{ jobId: rule.jobId }} className="block text-primary hover:underline">Job <span className="font-mono">{rule.jobId}</span></Link>
          {rule.executionId && <Link to="/traces" search={{ execution: rule.executionId }} className="block text-primary hover:underline">AI trace <span className="font-mono">{rule.executionId}</span></Link>}
        </section>
      </aside>
    </div>
  );
}
