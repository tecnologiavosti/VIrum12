import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string;
}

export default function AdminBlogList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id,title,slug,category,status,published_at,updated_at')
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Artigo excluído');
    load();
  };

  const toggleStatus = async (p: Post) => {
    const next = p.status === 'published' ? 'draft' : 'published';
    const patch: Record<string, unknown> = { status: next };
    if (next === 'published' && !p.published_at) patch.published_at = new Date().toISOString();
    const { error } = await supabase.from('blog_posts').update(patch as any).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success(next === 'published' ? 'Publicado' : 'Despublicado');
    load();
  };

  const filtered = posts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (q && !p.title.toLowerCase().includes(q.toLowerCase()) && !(p.category || '').toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-serif">Blog</h1>
        <Button onClick={() => navigate('/admin/blog/new')}><Plus className="h-4 w-4 mr-2" />Novo artigo</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar por título ou categoria" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="all">Todos os status</option>
          <option value="draft">Rascunhos</option>
          <option value="published">Publicados</option>
        </select>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum artigo encontrado.</p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {filtered.map((p) => (
            <div key={p.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                    {p.status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                  {p.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.category}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">/{p.slug} · atualizado em {new Date(p.updated_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex gap-1">
                {p.status === 'published' && (
                  <Link to={`/blog/${p.slug}`} target="_blank" className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted"><Eye className="h-4 w-4" /></Link>
                )}
                <Button variant="ghost" size="icon" onClick={() => toggleStatus(p)} title={p.status === 'published' ? 'Despublicar' : 'Publicar'}>
                  {p.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/blog/${p.id}`)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}