import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileAppHeader } from './MobileAppHeader';
import { isMobileAppPath } from './mobileAppRoutes';
import { CookieConsent } from '@/components/CookieConsent';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const appView = Boolean(user) && isMobileAppPath(pathname);

  return (
    <div className={appView ? 'mobile-app-page flex min-h-screen min-h-[100dvh] flex-col' : 'flex min-h-screen min-h-[100dvh] flex-col'}>
      {appView ? (
        <>
          <div className="hidden lg:block"><Navbar /></div>
          <MobileAppHeader />
        </>
      ) : <Navbar />}
      <main
        className={appView
          ? 'min-w-0 flex-1 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0'
          : 'min-w-0 flex-1 pt-16'}
        style={appView ? { paddingTop: 'calc(4rem + env(safe-area-inset-top))' } : undefined}
      >
        {children}
      </main>
      {showFooter && (appView ? <div className="hidden lg:block"><Footer /></div> : <Footer />)}
      <CookieConsent />
    </div>
  );
}
