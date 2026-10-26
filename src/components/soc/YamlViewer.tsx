import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./primitives";
import { toast } from "sonner";

function highlightLine(line: string) {
  const comment = line.match(/^(\s*)(#.*)$/);
  if (comment) return <><span>{comment[1]}</span><span className="text-syn-comment">{comment[2]}</span></>;
  const m = line.match(/^(\s*)(- )?([\w.|@-]+)(:)(\s*)(.*)$/);
  if (m) {
    const [, ind, dash, key, colon, sp, val] = m;
    return <><span>{ind}</span>{dash && <span className="text-muted-foreground">{dash}</span>}<span className="text-syn-key">{key}</span><span className="text-muted-foreground">{colon}</span><span>{sp}</span>{value(val)}</>;
  }
  const li = line.match(/^(\s*)(- )(.*)$/);
  if (li) return <><span>{li[1]}</span><span className="text-muted-foreground">{li[2]}</span>{value(li[3])}</>;
  return <span className="text-syn-string">{line}</span>;
}
function value(v: string) {
  if (!v) return null;
  if (/^(true|false|null|\d+(\.\d+)?)$/.test(v)) return <span className="text-syn-number">{v}</span>;
  if (v === "|" || v === ">") return <span className="text-muted-foreground">{v}</span>;
  return <span className="text-syn-string">{v}</span>;
}

export function YamlViewer({ yaml, filename, highlightLines }: { yaml: string; filename: string; highlightLines?: Set<number> }) {
  const lines = yaml.replace(/\n$/, "").split("\n");
  const download = () => {
    const url = URL.createObjectURL(new Blob([yaml], { type: "text/yaml" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b bg-panel px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{filename}</span>
        <div className="flex items-center gap-1">
          <CopyButton value={yaml} label="Copy YAML" />
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={download}><Download className="h-3.5 w-3.5" />Download</Button>
        </div>
      </div>
      <pre className="max-h-[560px] overflow-auto py-2 font-mono text-[12.5px] leading-[1.6]" tabIndex={0} aria-label="Sigma rule YAML">
        {lines.map((l, i) => (
          <div key={i} className={highlightLines?.has(i + 1) ? "flex bg-warning/10" : "flex"}>
            <span className="w-11 shrink-0 select-none pr-3 text-right text-muted-foreground/50">{i + 1}</span>
            <code className="whitespace-pre pr-4">{highlightLine(l)}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
