import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles, Loader2, Save, Send, Wand2 } from 'lucide-react';

function slugify(s: string) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface FormState {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  cover_image_source: 'ai' | 'url';
  category: string;
  tags: string;
  status: 'draft' | 'published';
  published_at: string | null;
}

const EMPTY: FormState = {
  title: '', slug: '', excerpt: '', content: '',
  cover_image_url: '', cover_image_source: 'url',
  category: '', tags: '', status: 'draft', published_at: null,
};

export default function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; category: string; angle: string }>>([]);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
      if (error || !data) { toast.error('Artigo não encontrado'); navigate('/admin/blog'); return; }
      setForm({
        id: data.id,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || '',
        content: data.content || '',
        cover_image_url: data.cover_image_url || '',
        cover_image_source: (data.cover_image_source as 'ai' | 'url') || 'url',
        category: data.category || '',
        tags: (data.tags || []).join(', '),
        status: data.status as 'draft' | 'published',
        published_at: data.published_at,
      });
      setSlugTouched(true);
      setLoading(false);
    })();
  }, [id, navigate]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onTitleChange = (t: string) => {
    setField('title', t);
    if (!slugTouched) setField('slug', slugify(t));
  };

  const generateCover = async () => {
    if (!form.title.trim()) return toast.error('Preencha o título primeiro');
    setGeneratingCover(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-style-image', {
        body: {
          style: form.category || form.title,
          tags: [form.title, form.category].filter(Boolean),
          variant: 'primary',
          orientation: 'landscape',
        },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('Nenhuma capa encontrada em Pexels/Unsplash');
      setField('cover_image_url', url);
      setField('cover_image_source', 'url');
      toast.success('Capa selecionada da biblioteca');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar capa');
    } finally { setGeneratingCover(false); }
  };

  const hasContent = () =>
    !!(form.title.trim() || form.excerpt.trim() || form.content.trim() || form.tags.trim());

  const openSuggest = async () => {
    if (hasContent()) {
      const ok = window.confirm('Gerar novas sugestões pode sobrescrever os campos atuais ao escolher uma pauta. Continuar?');
      if (!ok) return;
    }
    setSuggestOpen(true);
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-blog-titles', { body: {} });
      if (error) throw error;
      if (!data?.suggestions?.length) throw new Error(data?.error || 'Falha ao gerar sugestões');
      setSuggestions(data.suggestions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sugerir pautas');
      setSuggestOpen(false);
    } finally { setSuggestLoading(false); }
  };

  const pickSuggestion = async (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    setGeneratingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-content', {
        body: { title: s.title, category: s.category, angle: s.angle },
      });
      if (error) throw error;
      const a = data?.article;
      if (!a?.content) throw new Error(data?.error || 'Falha ao gerar artigo');
      setForm((f) => ({
        ...f,
        title: a.title || s.title,
        slug: slugify(a.title || s.title),
        excerpt: a.excerpt || '',
        content: a.content || '',
        category: a.category || s.category || f.category,
        tags: Array.isArray(a.tags) ? a.tags.join(', ') : f.tags,
      }));
      setSlugTouched(false);
      setSuggestOpen(false);
      toast.success('Artigo gerado — revise antes de publicar');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar artigo');
    } finally { setGeneratingIdx(null); }
  };

  const save = async (publish: boolean) => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      return toast.error('Título, slug e conteúdo são obrigatórios');
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const nextStatus: 'draft' | 'published' = publish ? 'published' : form.status;
      const publishedAt = publish
        ? (form.published_at || new Date().toISOString())
        : form.published_at;
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        cover_image_url: form.cover_image_url.trim() || null,
        cover_image_source: form.cover_image_source,
        category: form.category.trim() || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        status: nextStatus,
        published_at: publishedAt,
        author_id: userRes.user?.id ?? null,
      };
      if (form.id) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('blog_posts').insert(payload).select('id').single();
        if (error) throw error;
        setField('id', data.id);
        navigate(`/admin/blog/${data.id}`, { replace: true });
      }
      toast.success(publish ? 'Artigo publicado' : 'Rascunho salvo');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(msg.includes('blog_posts_slug_key') ? 'Slug já existe' : msg);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">Carregando…</div>;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-serif">{form.id ? 'Editar artigo' : 'Novo artigo'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openSuggest} disabled={suggestLoading}>
            <Wand2 className="h-4 w-4 mr-2" />Sugerir pautas com IA
          </Button>
          <Button variant="outline" onClick={() => save(false)} disabled={saving}><Save className="h-4 w-4 mr-2" />Salvar rascunho</Button>
          <Button onClick={() => save(true)} disabled={saving}><Send className="h-4 w-4 mr-2" />Publicar</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Título</Label>
          <Input value={form.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="O guarda-roupa essencial masculino" />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={form.slug} onChange={(e) => { setSlugTouched(true); setField('slug', slugify(e.target.value)); }} placeholder="guarda-roupa-essencial-masculino" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="Moda Masculina" />
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="alfaiataria, básicos, cores" />
          </div>
        </div>
        <div>
          <Label>Resumo (excerpt)</Label>
          <Textarea rows={2} value={form.excerpt} onChange={(e) => setField('excerpt', e.target.value)} placeholder="Um resumo curto usado em cards e SEO." />
        </div>

        <div className="space-y-3 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Label>Capa</Label>
            <div className="flex gap-2">
              <Button type="button" variant={form.cover_image_source === 'ai' ? 'default' : 'outline'} size="sm" onClick={() => setField('cover_image_source', 'ai')}>Gerada por IA</Button>
              <Button type="button" variant={form.cover_image_source === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setField('cover_image_source', 'url')}>URL manual</Button>
            </div>
          </div>
          {form.cover_image_source === 'ai' ? (
            <Button type="button" variant="outline" onClick={generateCover} disabled={generatingCover}>
              {generatingCover ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar capa com IA
            </Button>
          ) : (
            <Input value={form.cover_image_url} onChange={(e) => setField('cover_image_url', e.target.value)} placeholder="https://…" />
          )}
          {form.cover_image_url && (
            <img src={form.cover_image_url} alt="Preview da capa" className="w-full max-h-64 object-cover rounded-md border border-border" />
          )}
        </div>

        <div>
          <Label>Conteúdo (Markdown ou HTML)</Label>
          <Textarea rows={20} value={form.content} onChange={(e) => setField('content', e.target.value)} placeholder="# Título&#10;&#10;Texto do artigo…" className="font-mono text-sm" />
        </div>
      </div>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sugestões de pauta</DialogTitle>
            <DialogDescription>Clique em uma pauta para gerar o artigo completo.</DialogDescription>
          </DialogHeader>
          {suggestLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando sugestões…
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={generatingIdx !== null}
                  onClick={() => pickSuggestion(i)}
                  className="w-full text-left border border-border rounded-lg p-3 hover:bg-accent transition disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.category}</div>
                    {generatingIdx === i && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <div className="font-medium mt-1">{s.title}</div>
                  {s.angle && <div className="text-sm text-muted-foreground mt-1">{s.angle}</div>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}