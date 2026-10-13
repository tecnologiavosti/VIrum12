import type { MouseEvent } from 'react';

const handledEvents = new WeakSet<Event>();
let lastContactClick = -Infinity;

// One event for each contact action; suppress bubbling duplicates and double-clicks.
export function trackWhatsAppContact(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || handledEvents.has(event.nativeEvent)) return;
  const now = Date.now();
  if (now - lastContactClick < 1000) return;

  const gtag = (window as Window & {
    gtag?: (...args: unknown[]) => void;
  }).gtag;
  if (!gtag) return;

  handledEvents.add(event.nativeEvent);
  lastContactClick = now;
  try {
    gtag('event', 'conversion', {
      send_to: 'AW-18502093973/lZWCCNmzgpYdEJWZvvZE',
      value: 1.0,
      currency: 'BRL',
      transport_type: 'beacon',
    });
  } catch {
    // Tracking must never prevent the native WhatsApp link from opening.
  }
}
