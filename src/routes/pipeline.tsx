import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { validateCve } from "@/lib/format";
import { useJobs } from "@/lib/queries";
import { PageHeader, ErrorState, EmptyState, MockBadge } from "@/components/soc/primitives";
import { JobsTable } from "@/components/soc/JobsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CVE Pipeline — SigmaForge" },
      { name: "description", content: "Submit a CVE identifier to generate a Sigma detection rule." },
      { property: "og:title", content: "CVE Pipeline — SigmaForge" },
      { property: "og:description", content: "Submit a CVE identifier to generate a Sigma detection rule." },
    ],
  }),
  component: Pipeline,
});

function Pipeline() {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const err = validateCve(value);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const active = useJobs(true);
  const recent = useJobs(false);

  const submit = useMutation({
    mutationFn: (cve: string) => api().submitCve(cve),
    onSuccess: ({ jobId }, cve) => {
      toast.success(`Workflow created for ${cve}`, { description: jobId });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      navigate({ to: "/jobs/$jobId", params: { jobId } });
    },
    onError: (e: Error) => toast.error("Submission failed", { description: e.message }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (err || submit.isPending) return;
    submit.mutate(value.trim().toUpperCase());
  };

  return (
    <>
      <PageHeader title={<span className="flex items-center gap-2">CVE Pipeline <MockBadge /></span>} description="Submit a CVE to the backend pipeline. Status reflects backend state only." crumbs={[{ label: "Overview", to: "/" }, { label: "CVE Pipeline" }]} />

      <form onSubmit={onSubmit} className="panel mb-6 p-5" noValidate>
        <label htmlFor="cve" className="label-caps">CVE identifier</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="cve" value={value} autoComplete="off" spellCheck={false}
            onChange={(e) => setValue(e.target.value)} onBlur={() => value && setTouched(true)}
            placeholder="CVE-2025-12345" aria-invalid={touched && !!err} aria-describedby="cve-msg"
            className="h-10 font-mono text-sm uppercase placeholder:normal-case sm:max-w-sm"
          />
          <Button type="submit" className="h-10" disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {submit.isPending ? "Submitting…" : "Generate Sigma Rule"}
          </Button>
        </div>
        <p id="cve-msg" className="mt-2 min-h-5 text-xs" aria-live="polite">
          {touched && err ? <span className="flex items-center gap-1 text-danger"><AlertCircle className="h-3.5 w-3.5" />{err}</span>
            : <span className="text-muted-foreground">Format: CVE-YYYY-NNNN. The job opens automatically once the backend returns its ID.</span>}
        </p>
      </form>

      <section className="panel mb-5" aria-label="Active jobs">
        <div className="border-b p-3"><h2 className="text-sm font-semibold">Active jobs</h2></div>
        {active.error ? <div className="p-3"><ErrorState error={active.error} onRetry={() => active.refetch()} /></div> : <>
          <JobsTable jobs={active.data} loading={active.isLoading} />
          {active.data?.length === 0 && <EmptyState title="No active jobs" description="Queued and running jobs will appear here." />}
        </>}
      </section>

      <section className="panel" aria-label="Latest jobs">
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Latest submissions</h2>
          <Link to="/history" className="text-xs text-primary hover:underline">Full history</Link>
        </div>
        {recent.error ? <div className="p-3"><ErrorState error={recent.error} onRetry={() => recent.refetch()} /></div> : <JobsTable jobs={recent.data?.slice(0, MAX_ROWS)} loading={recent.isLoading} />}
      </section>
    </>
  );
}
