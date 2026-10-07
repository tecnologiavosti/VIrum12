import { useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Eye, EyeOff, Copy, Check, ShieldAlert, Key, Download,
  Loader2, Code2, Database, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";

type TableInfo = {
  tablename: string;
  row_count: number;
  column_count: number;
  encrypted_columns: number;
  has_user_id: boolean;
};

type PanelData = {
  project_url: string;
  anon_key: string;
  service_role_key: string;
  secrets: Record<string, string>;
  edge_functions: string[];
  edge_functions_count: number;
  database_tables: TableInfo[];
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function maskValue(v: string) {
  if (!v) return "";
  if (v.length <= 24) return v;
  return `${v.slice(0, 12)}•••••${v.slice(-8)}`;
}

function classifyTable(t: TableInfo): { label: string; tone: string } {
  const name = t.tablename.toLowerCase();
  if (/(log|webhook|rate_limit|audit)/.test(name)) return { label: "Ignorar", tone: "bg-muted text-muted-foreground" };
  if (t.has_user_id || /(profile|user|subscription|plan|payment|coupon|affiliate|diagnos)/.test(name))
    return { label: "Essencial", tone: "bg-primary/20 text-primary" };
  return { label: "Histórico", tone: "bg-secondary text-secondary-foreground" };
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label ?? "Valor"} copiado`);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label && <span className="ml-2">{label}</span>}
    </Button>
  );
}

function SecretRow({ label, value }: { label: string; value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 p-2 rounded border border-border bg-card">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-mono text-xs truncate">{show ? value : maskValue(value)}</div>
      </div>
      <Button size="icon" variant="ghost" onClick={() => setShow((s) => !s)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      <CopyBtn value={value} />
    </div>
  );
}

function StepCard({ n, title, icon, children }: { n: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{n}</div>
        <div className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</div>
      </div>
      {children}
    </Card>
  );
}

export default function PainelMigracao() {
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);

  async function revealAll() {
    setLoading(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/painel-migracao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
        },
        body: JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Falha");
      setData(json);
      toast.success("Dados carregados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    if (!data) return;
    const extras = Object.entries(data.secrets)
      .filter(([k]) => !["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_PUBLISHABLE_KEY","SUPABASE_SERVICE_ROLE_KEY"].includes(k))
      .map(([k,v]) => `${k}=${v}`).join("\n");
    const text = [
      "═══ CREDENCIAIS ═══",
      `PROJECT_URL=${data.project_url}`,
      `ANON_KEY=${data.anon_key}`,
      `SERVICE_ROLE_KEY=${data.service_role_key}`,
      "",
      "═══ EDGE FUNCTIONS ═══",
      data.edge_functions.join(", "),
      "",
      "═══ SECRETS ═══",
      extras,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Tudo copiado");
  }

  async function downloadEdgeFunctions() {
    const fnModules = import.meta.glob("/supabase/functions/*/index.ts", {
      query: "?raw", import: "default", eager: true,
    }) as Record<string, string>;
    const sharedModules = import.meta.glob("/supabase/functions/_shared/*.ts", {
      query: "?raw", import: "default", eager: true,
    }) as Record<string, string>;

    const zip = new JSZip();
    let fnCount = 0;
    for (const [path, src] of Object.entries(fnModules)) {
      const name = path.split("/").slice(-2, -1)[0];
      if (name === "_shared") continue;
      zip.file(`functions/${name}/index.ts`, src);
      fnCount++;
    }
    for (const [path, src] of Object.entries(sharedModules)) {
      const filename = path.split("/").pop()!;
      zip.file(`functions/_shared/${filename}`, src);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "edge-functions.zip"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fnCount} funções + ${Object.keys(sharedModules).length} shared exportados`);
  }

  function downloadSecrets() {
    if (!data) return;
    const entries = Object.entries(data.secrets)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
    const content = `export const SECRETS = {\n${entries}\n} as const;\n\nexport type SecretKey = keyof typeof SECRETS;\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "secrets.ts"; a.click();
    URL.revokeObjectURL(url);
    toast.success("secrets.ts baixado");
  }

  const extraSecrets = data
    ? Object.entries(data.secrets).filter(([k]) =>
        !["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_PUBLISHABLE_KEY","SUPABASE_SERVICE_ROLE_KEY"].includes(k))
    : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Painel de Migração</h1>
          <p className="text-muted-foreground">Copie os itens abaixo na ordem e cole na extensão CloneSupa.</p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={revealAll} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Revelar Tudo
          </Button>
          {data && (
            <Button size="lg" variant="secondary" onClick={copyAll}>
              <Copy className="mr-2 h-4 w-4" /> Copiar Tudo
            </Button>
          )}
        </div>

        {!data && (
          <Card className="p-6 flex items-start gap-3 border-dashed">
            <Info className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Clique em <strong>Revelar Tudo</strong> para carregar credenciais, edge functions, secrets e a lista de tabelas do banco.
            </div>
          </Card>
        )}

        {data && (
          <>
            <StepCard n={1} title="Credenciais" icon={<ShieldAlert className="h-5 w-5" />}>
              <div className="space-y-2">
                <SecretRow label="Project URL" value={data.project_url} />
                <SecretRow label="Anon Key" value={data.anon_key} />
                <SecretRow label="Service Role Key" value={data.service_role_key} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <CopyBtn value={data.project_url} label="Copiar Project URL" />
                <CopyBtn value={data.service_role_key} label="Copiar Service Role Key" />
              </div>
            </StepCard>

            <StepCard n={2} title="edge functions" icon={<Code2 className="h-5 w-5" />}>
              <div className="flex flex-wrap gap-2">
                {data.edge_functions.map((n) => (
                  <Badge key={n} variant="secondary" className="font-mono text-xs">{n}</Badge>
                ))}
              </div>
              <Button onClick={downloadEdgeFunctions}>
                <Download className="mr-2 h-4 w-4" /> Baixar edge-functions.zip
              </Button>
              <p className="text-xs text-muted-foreground">
                Descompacte na raiz do projeto de destino (mantém <code>supabase/functions/&lt;nome&gt;/index.ts</code> e <code>_shared/</code>) e rode <code>supabase functions deploy &lt;nome&gt;</code>.
              </p>
            </StepCard>

            <StepCard n={3} title="Secrets" icon={<Key className="h-5 w-5" />}>
              <div className="space-y-2">
                {extraSecrets.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum secret extra além dos padrão do Supabase.</p>
                )}
                {extraSecrets.map(([k, v]) => (
                  <SecretRow key={k} label={k} value={v} />
                ))}
              </div>
              <Button onClick={downloadSecrets}>
                <Download className="mr-2 h-4 w-4" /> Baixar secrets.ts
              </Button>
            </StepCard>

            <StepCard n={4} title="Conferência" icon={<Database className="h-5 w-5" />}>
              <div className="text-sm text-muted-foreground">
                {Array.isArray(data.database_tables) ? data.database_tables.length : 0} tabelas encontradas no schema public.
              </div>
              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Tabela</th>
                      <th className="text-right p-2">Linhas</th>
                      <th className="text-right p-2">Colunas</th>
                      <th className="text-center p-2">Classificação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.database_tables ?? []).map((t) => {
                      const c = classifyTable(t);
                      return (
                        <tr key={t.tablename} className="border-t border-border">
                          <td className="p-2 font-mono text-xs">{t.tablename}</td>
                          <td className="p-2 text-right">{t.row_count}</td>
                          <td className="p-2 text-right">{t.column_count}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${c.tone}`}>{c.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Senhas são copiadas como hash bcrypt. Se o JWT secret do destino for diferente,
                  as sessões antigas caem, mas os usuários continuam conseguindo logar com a mesma senha.
                </p>
              </div>
            </StepCard>
          </>
        )}
      </div>
    </div>
  );
}