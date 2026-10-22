/** Páginas autenticadas com navegação inferior no celular. */
export function isMobileAppPath(pathname: string): boolean {
  return [
    '/account', '/new-diagnosis', '/profile', '/pricing',
    '/how-it-works', '/payment-success', '/payment-failed',
  ].includes(pathname) ||
    (pathname.startsWith('/diagnosis/') && !pathname.startsWith('/diagnosis/share/'));
}
