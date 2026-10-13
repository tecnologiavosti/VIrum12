import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { trackWhatsAppContact } from '@/lib/googleAds';

export const VIRUM_CONTACT = {
  email: 'contato@virum.com.br',
  phone: '(61) 99811-7985',
  whatsapp: 'https://wa.me/5561998117985',
  instagram: 'https://www.instagram.com/virumformen/',
  instagramHandle: 'virumformen',
};

export function WhatsAppCTA({ className = '', label = 'Fale pelo WhatsApp' }: {
  className?: string;
  label?: string;
}) {
  return (
    <Button asChild variant="premium" className={className}>
      <a href={VIRUM_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer"
        onClick={trackWhatsAppContact}>
        <MessageCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}
