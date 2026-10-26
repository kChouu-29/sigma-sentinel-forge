import { createFileRoute } from "@tanstack/react-router";
import { useRule } from "@/lib/queries";
import { PageHeader, ErrorState, MockBadge, Mono } from "@/components/soc/primitives";
import { RulePanel } from "@/components/soc/RulePanel";
import { RuleStateBadge } from "@/components/soc/status";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/rules/$ruleId")({
  head: ({ params }) => ({
    meta: [
      { title: `Rule ${params.ruleId} — SigmaForge` },
      { name: "description", content: "Sigma rule YAML, metadata and validation results." },
      { property: "og:title", content: `Rule ${params.ruleId} — SigmaForge` },
      { property: "og:description", content: "Sigma rule detail." },
    ],
  }),
  component: RuleDetail,
});

function RuleDetail() {
  const { ruleId } = Route.useParams();
  const { data, isLoading, error, refetch } = useRule(ruleId);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Sigma Rules", to: "/rules" }, { label: data?.cveId ?? ruleId }]}
        title={data ? <span className="flex flex-wrap items-center gap-3"><Mono copy className="text-xl font-semibold">{data.cveId}</Mono><RuleStateBadge state={data.state} /><MockBadge /></span> : "Rule"}
        description={data?.fields.title}
      />
      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isLoading || !data ? <Skeleton className="h-[500px]" /> : <RulePanel rule={data} />}
    </>
  );
}
