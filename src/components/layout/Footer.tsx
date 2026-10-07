import { Logo } from '@/components/Logo';
import { Link } from 'react-router-dom';
import { Instagram, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneBR, phoneDigits } from '@/lib/formatPhone';

interface ContactSettings {
  email?: string;
  phone?: string;
  instagram?: string;
}

function unwrap(val: any): string {
  if (typeof val === 'string') return val.replace(/^"|"$/g, '');
  return val ?? '';
}

export function Footer() {
  const [contact, setContact] = useState<ContactSettings>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['contact_email', 'contact_phone', 'contact_instagram']);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = unwrap(s.value); });
        setContact({
          email: map.contact_email,
          phone: map.contact_phone,
          instagram: map.contact_instagram,
        });
      }
    })();
  }, []);

  const phoneFormatted = contact.phone ? formatPhoneBR(contact.phone) : '';
  const phoneRaw = contact.phone ? phoneDigits(contact.phone) : '';
  const waLink = phoneRaw ? `https://wa.me/55${phoneRaw}` : '';
  const igHandle = (contact.instagram || '').replace(/^@/, '').trim();
  const igLink = igHandle ? `https://instagram.com/${igHandle}` : '';
  const email = contact.email || '';

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <Link to="/">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Descubra sua essência através da nossa análise personalizada de imagem com inteligência artificial.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {igLink && (
                <a
                  href={igLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram VIRUM"
                  className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp VIRUM"
                  className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Navegação</h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Início' },
                { to: '/how-it-works', label: 'Como Funciona' },
                { to: '/blog', label: 'Blog' },
                { to: '/#pricing', label: 'Preços' },
                { to: '/faq', label: 'FAQ' },
              ].map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Cookies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-5">Contato</h4>
            <ul className="space-y-3">
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {email}
                  </a>
                </li>
              )}
              {waLink && (
                <li>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                  >
                    <Phone className="h-3.5 w-3.5" /> {phoneFormatted}
                  </a>
                </li>
              )}
              {igLink && (
                <li>
                  <a
                    href={igLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                  >
                    <Instagram className="h-3.5 w-3.5" /> @{igHandle}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VIRUM. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
