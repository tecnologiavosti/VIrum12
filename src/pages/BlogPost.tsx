import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

interface Post {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  cover_image_url: string | null; category: string | null; tags: string[] | null;
  published_at: string | null; updated_at?: string | null;
}

// Strip a leading H1 (Markdown `#` or <h1>) so it never duplicates the page title.
function stripLeadingH1(content: string, title: string): string {
  let c = content.replace(/^\uFEFF?\s+/, '');
  const mdH1 = /^#\s+(.+?)\s*\n+/;
  const htmlH1 = /^<h1[^>]*>([\s\S]*?)<\/h1>\s*/i;
  const m1 = c.match(mdH1);
  if (m1 && (!title || m1[1].trim().toLowerCase() === title.trim().toLowerCase() || true)) {
    c = c.replace(mdH1, '');
  } else {
    const m2 = c.match(htmlH1);
    if (m2) c = c.replace(htmlH1, '');
  }
  return c;
}

function ArticleBody({ content, title }: { content: string; title: string }) {
  const cleaned = stripLeadingH1(content, title);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: () => null, // never render a second H1
        h2: ({ node, ...p }) => <h2 className="font-serif text-2xl md:text-3xl mt-12 mb-4" {...p} />,
        h3: ({ node, ...p }) => <h3 className="font-serif text-xl mt-8 mb-3" {...p} />,
        p: ({ node, ...p }) => <p className="mb-5 leading-relaxed text-foreground/90" {...p} />,
        ul: ({ node, ...p }) => <ul className="list-disc pl-6 mb-5 space-y-2" {...p} />,
        ol: ({ node, ...p }) => <ol className="list-decimal pl-6 mb-5 space-y-2" {...p} />,
        li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
        a: ({ node, ...p }) => <a className="text-primary underline underline-offset-4 hover:no-underline" {...p} />,
        blockquote: ({ node, ...p }) => (
          <blockquote className="border-l-2 border-primary pl-5 my-6 italic text-muted-foreground" {...p} />
        ),
        strong: ({ node, ...p }) => <strong className="text-foreground font-semibold" {...p} />,
        hr: () => <hr className="my-10 border-border" />,
        img: ({ node, ...p }) => <img className="rounded-lg border border-border my-6" loading="lazy" {...p} />,
      }}
    >
      {cleaned}
    </ReactMarkdown>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id,title,slug,excerpt,content,cover_image_url,category,tags,published_at,updated_at')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      if (!data) setNotFound(true);
      else setPost(data as Post);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto px-4 pt-32 pb-20 text-muted-foreground">Carregando…</main></div>;
  if (notFound || !post) return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto px-4 pt-32 pb-20"><p className="text-muted-foreground">Artigo não encontrado.</p><Link to="/blog" className="text-primary text-sm mt-4 inline-block">← Voltar ao blog</Link></main></div>;

  const url = `https://virum.com.br/blog/${post.slug}`;
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} — VIRUM</title>
        {post.excerpt && <meta name="description" content={post.excerpt} />}
        <link rel="canonical" href={url} />
        <meta property="og:title" content={post.title} />
        {post.excerpt && <meta property="og:description" content={post.excerpt} />}
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
        <meta name="twitter:card" content={post.cover_image_url ? 'summary_large_image' : 'summary'} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt || undefined,
          image: post.cover_image_url || undefined,
          datePublished: post.published_at || undefined,
          dateModified: post.updated_at || post.published_at || undefined,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          author: { '@type': 'Organization', name: 'VIRUM' },
          publisher: {
            '@type': 'Organization',
            name: 'VIRUM',
            logo: { '@type': 'ImageObject', url: 'https://virum.com.br/virum-logo.svg' },
          },
          articleSection: post.category || undefined,
          keywords: post.tags?.join(', '),
        })}</script>
      </Helmet>
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-3xl">
        <Link to="/blog" className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors">← Blog</Link>
        <header className="mt-6 mb-10">
          {post.category && <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">{post.category}</p>}
          <h1 className="font-serif text-4xl md:text-5xl leading-tight">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>}
          {post.published_at && <p className="mt-4 text-xs text-muted-foreground/70">{new Date(post.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
        </header>
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} className="w-full aspect-[16/9] object-cover rounded-lg border border-border mb-10" />
        )}
        <article className="text-foreground/90">
          <ArticleBody content={post.content} title={post.title} />
        </article>
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="text-[11px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-border text-muted-foreground">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-16 p-8 border border-border rounded-lg bg-secondary/40 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">VIRUM</p>
          <h3 className="font-serif text-2xl mb-3">Descubra o seu estilo com um diagnóstico premium</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">Consultoria de imagem masculina com IA — cores, modelagens, guarda-roupa cápsula e looks feitos sob medida.</p>
          <Button asChild variant="premium"><Link to="/new-diagnosis">Começar meu diagnóstico</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}