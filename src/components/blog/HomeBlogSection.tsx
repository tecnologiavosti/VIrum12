import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; category: string | null; published_at: string | null;
}

export function HomeBlogSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,cover_image_url,category,published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);
      setPosts((data as Post[]) || []);
    })();
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="py-24 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Diário VIRUM</p>
            <h2 className="font-serif text-3xl md:text-4xl">Últimas do Blog</h2>
          </div>
          <Link to="/blog" className="text-sm text-primary hover:underline">Ver todos os artigos →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <h3 className="font-serif text-lg leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                {p.excerpt && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}