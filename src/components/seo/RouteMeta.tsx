import { useLocation } from 'react-router-dom';
import { SEOHead } from './SEOHead';

// Paths that must not be indexed by search engines.
const NOINDEX_PREFIXES = [
  '/auth',
  '/reset-password',
  '/account',
  '/dashboard',
  '/profile',
  '/new-diagnosis',
  '/payment-success',
  '/payment-failed',
  '/admin',
];

// Diagnosis result page (individual): /diagnosis/:id but NOT /diagnosis/share/:token
function isPrivateDiagnosis(pathname: string) {
  return pathname.startsWith('/diagnosis/') && !pathname.startsWith('/diagnosis/share/');
}

/**
 * Route-level meta fallback. Pages that render their own <SEOHead> override
 * these tags via react-helmet-async's dedupe. This ensures every private
 * route ships with noindex even if the page component forgets to set it.
 */
export function RouteMeta() {
  const location = useLocation();
  const pathname = location.pathname;
  const isPrivate =
    NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    isPrivateDiagnosis(pathname);

  if (!isPrivate) return null;

  return (
    <SEOHead
      title="VIRUM — Área privada"
      description="Área privada VIRUM."
      canonicalPath={pathname}
      noindex
    />
  );
}