import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PlugZap, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { defaultConfig, endpoints, getConfig, setConfig, type ApiConfig } from "@/lib/api/config";
import { httpAdapter } from "@/lib/api/http";
import { PageHeader } from "@/components/soc/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SigmaForge" },
      { name: "description", content: "Configure the backend API connection for the SOC console." },
      { property: "og:title", content: "Settings — SigmaForge" },
      { property: "og:description", content: "Configure the backend API connection." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [cfg, setCfg] = useState<ApiConfig>(defaultConfig);
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "fail"; msg?: string }>({ state: "idle" });
  useEffect(() => setCfg(getConfig()), []);

  const runTest = async () => {
    setTest({ state: "testing" });
    const prev = getConfig();
    try {
      setConfig({ ...cfg, mode: "live" });
      const h = await httpAdapter.health();
      setTest({ state: "ok", msg: `Reachable · ${h.latencyMs}ms${h.version ? ` · ${h.version}` : ""}` });
    } catch (e) {
      setTest({ state: "fail", msg: (e as Error).message });
    } finally {
      setConfig(prev);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="API connection configuration. Stored in this browser only." />
      <div className="grid max-w-5xl gap-5 lg:grid-cols-[1fr_340px]">
        <form className="panel space-y-5 p-5" onSubmit={(e) => { e.preventDefault(); setConfig(cfg); toast.success("Settings saved", { description: `Mode: ${cfg.mode}` }); }}>
          <fieldset>
            <legend className="label-caps mb-2">Data source</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["mock", "live"] as const).map((m) => (
                <label key={m} className={cn("cursor-pointer rounded-md border p-3 text-sm", cfg.mode === m ? "border-primary bg-primary/10" : "hover:bg-accent/40")}>
                  <input type="radio" name="mode" value={m} checked={cfg.mode === m} onChange={() => setCfg({ ...cfg, mode: m })} className="sr-only" />
                  <span className="font-medium">{m === "mock" ? "Mock adapter" : "Live backend"}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{m === "mock" ? "Synthetic sample data. Every page is labelled MOCK DATA." : "Real API at the base URL below. No mock data is shown."}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="base">API base URL</Label>
            <Input id="base" value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} placeholder="https://soc-api.internal/api/v1" className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">Default from <code className="font-mono">VITE_API_BASE_URL</code>.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="timeout">Request timeout (ms)</Label>
              <Input id="timeout" type="number" min={1000} step={500} value={cfg.timeoutMs} onChange={(e) => setCfg({ ...cfg, timeoutMs: Number(e.target.value) })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poll">Job polling interval (ms)</Label>
              <Input id="poll" type="number" min={1000} step={500} value={cfg.pollIntervalMs} onChange={(e) => setCfg({ ...cfg, pollIntervalMs: Number(e.target.value) })} className="font-mono" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button type="submit"><Save className="h-4 w-4" />Save</Button>
            <Button type="button" variant="outline" onClick={runTest} disabled={!cfg.baseUrl || test.state === "testing"}>
              {test.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}Test connection
            </Button>
            {test.state === "ok" && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />{test.msg}</span>}
            {test.state === "fail" && <span className="flex items-center gap-1 text-xs text-danger"><XCircle className="h-3.5 w-3.5" />{test.msg}</span>}
          </div>
        </form>

        <aside className="space-y-4">
          <div className="panel border-warning/40 p-4 text-xs">
            <p className="mb-1.5 flex items-center gap-1.5 font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5" />Endpoints not yet confirmed</p>
            <p className="text-muted-foreground">No backend API documentation was provided. The live adapter uses the placeholder paths below and assumes JSON responses matching the console's types. Confirm them against the real spec before relying on live mode. Real-time updates use polling until the backend's event mechanism is known.</p>
          </div>
          <div className="panel p-4">
            <p className="label-caps mb-2">Endpoint map</p>
            <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
              {Object.entries(endpoints).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2"><span>{k}</span><span className="text-foreground">{typeof v === "function" ? v(":id") : v}</span></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
