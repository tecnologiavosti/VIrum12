import { ArrowLeft, LogOut, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function titleFor(path: string) {
  if (path === '/account') return 'Início';
  if (path === '/new-diagnosis') return 'Novo diagnóstico';
  if (path === '/profile') return 'Meu perfil';
  if (path === '/pricing') return 'Planos';
  if (path === '/how-it-works') return 'Como funciona';
  if (path === '/payment-success') return 'Pagamento confirmado';
  if (path === '/payment-failed') return 'Pagamento';
  if (path.startsWith('/diagnosis/')) return 'Meu diagnóstico';
  return 'VIRUM';
}

export function MobileAppHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isHome = pathname === '/account';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-[65] border-b border-border/70 bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      aria-label="Barra superior do aplicativo"
    >
      <div className="grid h-16 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-3">
        {isHome ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-serif text-xl text-primary-foreground" aria-hidden="true">
            V
          </div>
        ) : (
          <button type="button" onClick={() => navigate('/account')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground active:bg-muted"
            aria-label="Voltar para início">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="truncate text-center text-base font-semibold tracking-tight">{titleFor(pathname)}</span>
        {pathname === '/profile' ? (
          <button type="button" onClick={handleSignOut}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
            aria-label="Sair da conta"><LogOut className="h-5 w-5" /></button>
        ) : (
          <button type="button" onClick={() => navigate('/profile')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
            aria-label="Abrir meu perfil"><UserRound className="h-5 w-5" /></button>
        )}
      </div>
    </header>
  );
}
