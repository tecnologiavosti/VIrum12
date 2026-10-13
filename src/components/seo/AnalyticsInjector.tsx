import { useEffect } from 'react';
import { useSeoSettingsAll } from '@/hooks/useSeoSettings';

/**
 * Injeta scripts de analytics/pixels no <head> conforme configurações em
 * Admin → SEO. Idempotente: cada script tem um id único.
 */
function inject(id: string, html: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.innerHTML = html;
  document.head.appendChild(s);
}

function injectSrc(id: string, src: string) {
  if (document.getElementById(id)) return;
  // Google Ads in index.html already loads the shared gtag library.
  if (src.startsWith('https://www.googletagmanager.com/gtag/js') &&
      document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]')) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function AnalyticsInjector() {
  const { data } = useSeoSettingsAll();

  useEffect(() => {
    if (!data) return;
    const g = data.google ?? {};
    const m = data.microsoft ?? {};
    const px = data.pixels ?? {};

    if (g.ga4) {
      injectSrc('ga4-src', `https://www.googletagmanager.com/gtag/js?id=${g.ga4}`);
      inject('ga4-init', `gtag('config','${g.ga4}');`);
    }
    if (g.gtm) {
      inject('gtm-init', `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${g.gtm}');`);
    }
    if (m.clarity) {
      inject('clarity-init', `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${m.clarity}");`);
    }
    if (px.facebook?.enabled && px.facebook?.id) {
      inject('fbq-init', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px.facebook.id}');fbq('track','PageView');`);
    }
    if (px.tiktok?.enabled && px.tiktok?.id) {
      inject('ttq-init', `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${px.tiktok.id}');ttq.page();}(window,document,'ttq');`);
    }
  }, [data]);

  return null;
}
