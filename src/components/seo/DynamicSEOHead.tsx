import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSeoSettingsAll, useSeoPageForPath } from '@/hooks/useSeoSettings';

const SITE_URL = 'https://virum.com.br';

/**
 * Sobrescreve dinamicamente as meta tags do <head> com base nas configurações
 * cadastradas no painel Admin → SEO. Se a rota atual tiver uma linha em
 * seo_pages, os campos preenchidos têm prioridade; o restante vem das
 * configurações globais.
 */
export function DynamicSEOHead() {
  const location = useLocation();
  const { data: settings } = useSeoSettingsAll();
  const { data: page } = useSeoPageForPath(location.pathname);

  if (!settings) return null;

  const g = settings.general ?? {};
  const og = settings.open_graph ?? {};
  const tw = settings.twitter ?? {};
  const fav = settings.favicons ?? {};
  const google = settings.google ?? {};
  const microsoft = settings.microsoft ?? {};
  const schema = settings.schema ?? {};

  const title = page?.title || g.site_title || 'VIRUM';
  const description = page?.description || g.description || '';
  const canonical = page?.canonical || `${SITE_URL}${location.pathname}`;
  const ogImage = page?.og_image || og.image;
  const robots = page?.robots || g.robots || 'index,follow';

  const jsonLd: any[] = [];
  if (schema.organization) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: g.company || 'VIRUM',
      url: g.canonical || SITE_URL,
      logo: ogImage,
    });
  }
  if (schema.website) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: g.company || 'VIRUM',
      url: g.canonical || SITE_URL,
    });
  }

  return (
    <Helmet>
      <html lang={g.language || 'pt-BR'} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {g.keywords && <meta name="keywords" content={g.keywords} />}
      {g.author && <meta name="author" content={g.author} />}
      <meta name="robots" content={robots} />
      {g.theme_color && <meta name="theme-color" content={g.theme_color} />}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={og.title || title} />
      <meta property="og:description" content={og.description || description} />
      <meta property="og:type" content={og.type || 'website'} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {og.site_name && <meta property="og:site_name" content={og.site_name} />}

      {/* Twitter */}
      <meta name="twitter:card" content={tw.card || 'summary_large_image'} />
      <meta name="twitter:title" content={tw.title || title} />
      <meta name="twitter:description" content={tw.description || description} />
      {(tw.image || ogImage) && <meta name="twitter:image" content={tw.image || ogImage} />}

      {/* Favicons */}
      {fav.ico && <link rel="icon" href={fav.ico} />}
      {fav.f32 && <link rel="icon" type="image/png" sizes="32x32" href={fav.f32} />}
      {fav.f16 && <link rel="icon" type="image/png" sizes="16x16" href={fav.f16} />}
      {fav.apple && <link rel="apple-touch-icon" href={fav.apple} />}
      {fav.manifest && <link rel="manifest" href={fav.manifest} />}

      {/* Verificações */}
      {google.search_console && <meta name="google-site-verification" content={google.search_console} />}
      {microsoft.bing_verification && <meta name="msvalidate.01" content={microsoft.bing_verification} />}

      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}
