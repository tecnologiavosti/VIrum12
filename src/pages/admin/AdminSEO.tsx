import { useState } from 'react';
import { useSeoSettingsAll, useSaveSeoSetting, useSeoPages, useSaveSeoPage, useDeleteSeoPage, type SeoCategory, type SeoPage } from '@/hooks/useSeoSettings';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Upload, Play, Trash2, Plus } from 'lucide-react';

function useCategory(cat: SeoCategory) {
  const { data, isLoading } = useSeoSettingsAll();
  const save = useSaveSeoSetting();
  const [local, setLocal] = useState<any | null>(null);
  const value = local ?? data?.[cat] ?? {};
  return {
    value,
    isLoading,
    set: (patch: any) => setLocal({ ...value, ...patch }),
    save: () => save.mutate({ category: cat, data: value }, { onSuccess: () => setLocal(null) }),
    saving: save.isPending,
  };
}

function Field({ label, value, onChange, textarea = false, type = 'text' }: any) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {textarea ? (
        <Textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function SaveBar({ onSave, saving }: any) {
  return (
    <div className="flex justify-end pt-4">
      <Button onClick={onSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
    </div>
  );
}

// ---- Tabs ----
function GeneralTab() {
  const { value: v, set, save, saving } = useCategory('general');
  return (
    <Card><CardHeader><CardTitle>Configurações Gerais</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Título padrão do site" value={v.site_title} onChange={(x: string) => set({ site_title: x })} />
        <Field label="Nome da empresa" value={v.company} onChange={(x: string) => set({ company: x })} />
        <div className="md:col-span-2"><Field label="Meta Description padrão" textarea value={v.description} onChange={(x: string) => set({ description: x })} /></div>
        <Field label="Keywords" value={v.keywords} onChange={(x: string) => set({ keywords: x })} />
        <Field label="URL canônica" value={v.canonical} onChange={(x: string) => set({ canonical: x })} />
        <Field label="Idioma" value={v.language} onChange={(x: string) => set({ language: x })} />
        <Field label="País" value={v.country} onChange={(x: string) => set({ country: x })} />
        <Field label="Autor" value={v.author} onChange={(x: string) => set({ author: x })} />
        <Field label="Robots" value={v.robots} onChange={(x: string) => set({ robots: x })} />
        <Field label="Theme color" value={v.theme_color} onChange={(x: string) => set({ theme_color: x })} />
        <Field label="Cor do navegador mobile" value={v.mobile_nav_color} onChange={(x: string) => set({ mobile_nav_color: x })} />
        <div className="md:col-span-2"><SaveBar onSave={save} saving={saving} /></div>
      </CardContent>
    </Card>
  );
}

function OpenGraphTab() {
  const { value: v, set, save, saving } = useCategory('open_graph');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Open Graph</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="OG Title" value={v.title} onChange={(x: string) => set({ title: x })} />
          <Field label="OG Description" textarea value={v.description} onChange={(x: string) => set({ description: x })} />
          <Field label="OG Image (URL)" value={v.image} onChange={(x: string) => set({ image: x })} />
          <Field label="OG Type" value={v.type} onChange={(x: string) => set({ type: x })} />
          <Field label="OG URL" value={v.url} onChange={(x: string) => set({ url: x })} />
          <Field label="Nome do site" value={v.site_name} onChange={(x: string) => set({ site_name: x })} />
          <SaveBar onSave={save} saving={saving} />
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            {v.image && <img src={v.image} alt="og" className="w-full aspect-[1.91/1] object-cover" />}
            <div className="p-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase">{v.url || 'virum.com.br'}</p>
              <p className="font-semibold text-sm line-clamp-2">{v.title || '—'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{v.description || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TwitterTab() {
  const { value: v, set, save, saving } = useCategory('twitter');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Twitter Cards</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Card Type" value={v.card} onChange={(x: string) => set({ card: x })} />
          <Field label="Title" value={v.title} onChange={(x: string) => set({ title: x })} />
          <Field label="Description" textarea value={v.description} onChange={(x: string) => set({ description: x })} />
          <Field label="Image" value={v.image} onChange={(x: string) => set({ image: x })} />
          <SaveBar onSave={save} saving={saving} />
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Preview do Card</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-2xl overflow-hidden">
            {v.image && <img src={v.image} alt="tw" className="w-full aspect-[2/1] object-cover" />}
            <div className="p-3 space-y-1">
              <p className="font-semibold text-sm">{v.title || '—'}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{v.description || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FaviconsTab() {
  const { value: v, set, save, saving } = useCategory('favicons');
  const fields: [string, string][] = [
    ['ico', 'favicon.ico'], ['f32', 'favicon 32x32'], ['f16', 'favicon 16x16'],
    ['apple', 'Apple Touch Icon'], ['android', 'Android Icon'], ['manifest', 'Manifest Icon'],
  ];
  return (
    <Card><CardHeader><CardTitle>Favicons</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {fields.map(([k, label]) => (
          <Field key={k} label={label + ' (URL)'} value={v[k]} onChange={(x: string) => set({ [k]: x })} />
        ))}
        <div className="md:col-span-2"><SaveBar onSave={save} saving={saving} /></div>
      </CardContent>
    </Card>
  );
}

function SitemapTab() {
  const { value: v, set, save, saving } = useCategory('sitemap_config');
  const [gen, setGen] = useState(false);
  const generate = async () => {
    setGen(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-sitemap-generate', { body: {} });
      if (error) throw error;
      toast.success(`Sitemap gerado (${data?.count ?? 0} URLs)`);
      set({ last_generated: new Date().toISOString() });
      save();
    } catch (e: any) { toast.error(e.message ?? 'Falha'); } finally { setGen(false); }
  };
  return (
    <Card><CardHeader><CardTitle>Sitemap</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Gerar sitemap automaticamente</Label>
          <Switch checked={!!v.auto_generate} onCheckedChange={(c) => set({ auto_generate: c })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Incluir páginas privadas</Label>
          <Switch checked={!!v.include_private} onCheckedChange={(c) => set({ include_private: c })} />
        </div>
        <p className="text-sm text-muted-foreground">Última atualização: {v.last_generated ? new Date(v.last_generated).toLocaleString('pt-BR') : '—'}</p>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={gen}><Play className="mr-2 h-4 w-4" />{gen ? 'Gerando…' : 'Gerar Sitemap'}</Button>
          <Button variant="outline" asChild><a href="/sitemap.xml" target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Baixar sitemap.xml</a></Button>
          <Button variant="outline" onClick={save} disabled={saving}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RobotsTab() {
  const { value: v, set, save, saving } = useCategory('robots_txt');
  const restore = () => set({ content: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /auth\n\nSitemap: https://virum.com.br/sitemap.xml' });
  return (
    <Card><CardHeader><CardTitle>Robots.txt</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Textarea rows={14} className="font-mono text-sm" value={v.content ?? ''} onChange={(e) => set({ content: e.target.value })} />
        <div className="flex justify-between">
          <Button variant="outline" onClick={restore}>Restaurar padrão</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoogleTab() {
  const { value: v, set, save, saving } = useCategory('google');
  return (
    <Card><CardHeader><CardTitle>Google</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Search Console Verification" value={v.search_console} onChange={(x: string) => set({ search_console: x })} />
        <Field label="Google Analytics (GA4)" value={v.ga4} onChange={(x: string) => set({ ga4: x })} />
        <Field label="Google Tag Manager" value={v.gtm} onChange={(x: string) => set({ gtm: x })} />
        <Field label="Google Ads Conversion ID" value={v.ads_conversion} onChange={(x: string) => set({ ads_conversion: x })} />
        <div className="md:col-span-2"><SaveBar onSave={save} saving={saving} /></div>
      </CardContent>
    </Card>
  );
}

function MicrosoftTab() {
  const { value: v, set, save, saving } = useCategory('microsoft');
  return (
    <Card><CardHeader><CardTitle>Microsoft</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Bing Webmaster Verification" value={v.bing_verification} onChange={(x: string) => set({ bing_verification: x })} />
        <Field label="Microsoft Clarity ID" value={v.clarity} onChange={(x: string) => set({ clarity: x })} />
        <div className="md:col-span-2"><SaveBar onSave={save} saving={saving} /></div>
      </CardContent>
    </Card>
  );
}

function PixelsTab() {
  const { value: v, set, save, saving } = useCategory('pixels');
  const providers: [string, string][] = [
    ['facebook', 'Facebook Pixel'], ['tiktok', 'TikTok Pixel'],
    ['pinterest', 'Pinterest Tag'], ['linkedin', 'LinkedIn Insight'],
  ];
  return (
    <Card><CardHeader><CardTitle>Pixels de Rastreamento</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {providers.map(([key, label]) => {
          const p = v[key] ?? {};
          return (
            <div key={key} className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto] items-end border rounded-lg p-3">
              <div><Label>{label} — ID</Label><Input value={p.id ?? ''} onChange={(e) => set({ [key]: { ...p, id: e.target.value } })} /></div>
              <div className="flex items-center gap-2"><Switch checked={!!p.enabled} onCheckedChange={(c) => set({ [key]: { ...p, enabled: c } })} /><span className="text-sm">{p.enabled ? 'Ativo' : 'Inativo'}</span></div>
              <Button variant="outline" size="sm" onClick={() => toast.info('Teste: verifique no navegador se o pixel disparou após ativar e salvar.')}>Testar</Button>
            </div>
          );
        })}
        <SaveBar onSave={save} saving={saving} />
      </CardContent>
    </Card>
  );
}

function SchemaTab() {
  const { value: v, set, save, saving } = useCategory('schema');
  const { data: settings } = useSeoSettingsAll();
  const items = ['organization', 'website', 'faq', 'breadcrumb', 'article', 'localbusiness', 'person'];
  const jsonPreview: any[] = [];
  const g = settings?.general ?? {};
  if (v.organization) jsonPreview.push({ '@context': 'https://schema.org', '@type': 'Organization', name: g.company, url: g.canonical });
  if (v.website) jsonPreview.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: g.company, url: g.canonical });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Schema.org</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((k) => (
            <div key={k} className="flex items-center justify-between">
              <Label className="capitalize">{k}</Label>
              <Switch checked={!!v[k]} onCheckedChange={(c) => set({ [k]: c })} />
            </div>
          ))}
          <SaveBar onSave={save} saving={saving} />
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>JSON-LD gerado</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">{JSON.stringify(jsonPreview, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function PagesTab() {
  const { data: pages } = useSeoPages();
  const save = useSaveSeoPage();
  const del = useDeleteSeoPage();
  const [editing, setEditing] = useState<SeoPage | null>(null);

  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Páginas</CardTitle>
      <Button size="sm" onClick={() => setEditing({ path: '/', enabled: true, priority: 0.5, changefreq: 'monthly', robots: 'index,follow' })}><Plus className="h-4 w-4 mr-1" />Nova</Button>
    </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Path</TableHead><TableHead>Título</TableHead><TableHead>Prioridade</TableHead><TableHead>Robots</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {pages?.map((p) => (
              <TableRow key={p.id ?? p.path}>
                <TableCell className="font-mono text-sm">{p.path}</TableCell>
                <TableCell className="max-w-xs truncate">{p.title}</TableCell>
                <TableCell>{p.priority}</TableCell>
                <TableCell>{p.robots}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => p.id && del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {editing && (
          <div className="mt-6 border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">{editing.id ? 'Editar' : 'Nova'} página</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Path" value={editing.path} onChange={(x: string) => setEditing({ ...editing, path: x })} />
              <Field label="SEO Title" value={editing.title} onChange={(x: string) => setEditing({ ...editing, title: x })} />
              <div className="md:col-span-2"><Field label="Meta Description" textarea value={editing.description} onChange={(x: string) => setEditing({ ...editing, description: x })} /></div>
              <Field label="Keywords" value={editing.keywords} onChange={(x: string) => setEditing({ ...editing, keywords: x })} />
              <Field label="Canonical URL" value={editing.canonical} onChange={(x: string) => setEditing({ ...editing, canonical: x })} />
              <Field label="OG Image" value={editing.og_image} onChange={(x: string) => setEditing({ ...editing, og_image: x })} />
              <Field label="Robots" value={editing.robots} onChange={(x: string) => setEditing({ ...editing, robots: x })} />
              <Field label="Prioridade Sitemap" type="number" value={editing.priority} onChange={(x: string) => setEditing({ ...editing, priority: Number(x) })} />
              <Field label="Frequência" value={editing.changefreq} onChange={(x: string) => setEditing({ ...editing, changefreq: x })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => save.mutate(editing, { onSuccess: () => setEditing(null) })} disabled={save.isPending}>Salvar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-audit', { body: {} });
      if (error) throw error;
      setResult(data);
    } catch (e: any) { toast.error(e.message ?? 'Falha'); } finally { setLoading(false); }
  };
  return (
    <Card><CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Auditoria SEO</CardTitle>
      <Button onClick={run} disabled={loading}><Play className="mr-2 h-4 w-4" />{loading ? 'Analisando…' : 'Executar auditoria'}</Button>
    </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground">Clique em "Executar auditoria" para verificar títulos duplicados, descriptions vazias, canonicals ausentes, etc.</p>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Nota geral</p>
              <p className="text-6xl font-bold text-primary">{result.score}/100</p>
            </div>
            <div className="grid gap-2">
              {(result.issues ?? []).map((it: any, i: number) => (
                <div key={i} className="border rounded p-3 text-sm">
                  <span className="font-semibold">{it.type}:</span> {it.message}
                </div>
              ))}
              {(result.issues ?? []).length === 0 && <p className="text-sm text-emerald-600">Nenhum problema detectado.</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Export/Import bar ----
function ImportExportBar() {
  const { data } = useSeoSettingsAll();
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data ?? {}, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'virum-seo-config.json'; a.click();
  };
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      for (const [cat, d] of Object.entries(parsed)) {
        await supabase.from('seo_settings').upsert({ category: cat, data: d as any }, { onConflict: 'category' });
      }
      toast.success('Configurações importadas'); location.reload();
    } catch (e: any) { toast.error(e.message ?? 'JSON inválido'); }
  };
  return (
    <div className="flex justify-end gap-2 mb-4">
      <Button variant="outline" size="sm" onClick={exportJson}><Download className="mr-2 h-4 w-4" />Exportar JSON</Button>
      <label className="inline-flex">
        <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importJson(e.target.files[0])} />
        <Button variant="outline" size="sm" asChild><span><Upload className="mr-2 h-4 w-4" />Importar JSON</span></Button>
      </label>
    </div>
  );
}

export default function AdminSEO() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-serif text-gradient-gold">SEO</h1>
        <p className="text-sm text-muted-foreground">Gerencie todas as configurações de SEO da VIRUM sem alterar código.</p>
      </div>
      <ImportExportBar />
      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="og">Open Graph</TabsTrigger>
          <TabsTrigger value="tw">Twitter</TabsTrigger>
          <TabsTrigger value="fav">Favicons</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="robots">Robots</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="microsoft">Microsoft</TabsTrigger>
          <TabsTrigger value="pixels">Pixels</TabsTrigger>
          <TabsTrigger value="schema">Schema.org</TabsTrigger>
          <TabsTrigger value="pages">Páginas</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="general"><GeneralTab /></TabsContent>
        <TabsContent value="og"><OpenGraphTab /></TabsContent>
        <TabsContent value="tw"><TwitterTab /></TabsContent>
        <TabsContent value="fav"><FaviconsTab /></TabsContent>
        <TabsContent value="sitemap"><SitemapTab /></TabsContent>
        <TabsContent value="robots"><RobotsTab /></TabsContent>
        <TabsContent value="google"><GoogleTab /></TabsContent>
        <TabsContent value="microsoft"><MicrosoftTab /></TabsContent>
        <TabsContent value="pixels"><PixelsTab /></TabsContent>
        <TabsContent value="schema"><SchemaTab /></TabsContent>
        <TabsContent value="pages"><PagesTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}
