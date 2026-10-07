import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SEOHead } from '@/components/seo/SEOHead';

interface Post {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; category: string | null; published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,cover_image_url,category,published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog VIRUM — Moda masculina, estilo e imagem"
        description="Artigos sobre moda masculina, alfaiataria, cores, guarda-roupa e imagem pessoal — pela consultoria de imagem masculina VIRUM."
        canonicalPath="/blog"
      />
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20">
        <header className="mb-14 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Diário VIRUM</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">Moda masculina, estilo e imagem</h1>
          <p className="mt-4 text-muted-foreground">Ideias e ferramentas para construir uma imagem própria — sem seguir tendências passageiras.</p>
        </header>
        {loading ? (
          <p className="text-muted-foreground">Carregando artigos…</p>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">Nenhum artigo publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted/30 border border-border">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted/20" />
                  )}
                </div>
                <div className="mt-4">
                  {p.category && <p className="text-[10px] uppercase tracking-[0.25em] text-primary mb-2">{p.category}</p>}
                  <h2 className="font-serif text-xl leading-snug group-hover:text-primary transition-colors">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
                  {p.published_at && <p className="mt-3 text-xs text-muted-foreground/70">{new Date(p.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}