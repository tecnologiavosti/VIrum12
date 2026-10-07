-- Blog posts table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  cover_image_source text NOT NULL DEFAULT 'url' CHECK (cover_image_source IN ('ai','url')),
  category text,
  tags text[],
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read published posts
CREATE POLICY "Public can read published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Admins can do everything (including read drafts)
CREATE POLICY "Admins manage all posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX blog_posts_status_published_at_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts (category);

-- Slug helper (idempotent, unaccent-lite via translate)
CREATE OR REPLACE FUNCTION public.slugify_blog_title(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(translate(
        coalesce(_title,''),
        'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
        'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
      )),
      '[^a-z0-9]+', '-', 'g'
    )
  )
$$;