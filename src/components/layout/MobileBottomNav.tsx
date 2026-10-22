import { NavLink, useLocation } from 'react-router-dom';
import { Home, Sparkles, Crown, UserRound, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/account', label: 'Início', icon: Home, match: (path: string, hash: string) => path === '/account' && hash !== '#historico' },
  { to: '/new-diagnosis', label: 'Diagnóstico', icon: Sparkles, match: (path: string) => path === '/new-diagnosis' },
  { to: '/account#historico', label: 'Histórico', icon: History, match: (path: string, hash: string) => path === '/account' && hash === '#historico' },
  { to: '/profile', label: 'Perfil', icon: UserRound, match: (path: string) => path === '/profile' },
  { to: '/pricing', label: 'Planos', icon: Crown, match: (path: string) => path === '/pricing' },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] rounded-t-[22px] border-t border-border/70 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"
      aria-label="Navegação do aplicativo"
    >
      <div className="grid grid-cols-5 items-stretch gap-0.5 px-2 pt-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname, location.hash);
          const isPrimary = to === '/new-diagnosis';
          return (
            <NavLink
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (location.pathname === '/account' && to === '/account') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (location.pathname === '/account' && to === '/account#historico') {
                  document.getElementById('historico')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={cn(
                'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span className={cn(
                'flex h-8 w-12 items-center justify-center rounded-xl transition-colors',
                active ? 'bg-primary text-primary-foreground' : isPrimary ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              )}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
              </span>
              <span className="w-full truncate text-center leading-tight">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
