import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthenticatedFunction } from '@/lib/authenticatedFunctions';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  features: unknown;
}
interface CouponPreview {
  valid: boolean;
  error?: string;
  code?: string;
  final_cents?: number;
  discount_cents?: number;
}
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function PlanCard({ plan, popular, checkoutBusy, onCheckout }: {
  plan: Plan; popular: boolean; checkoutBusy: boolean;
  onCheckout: (plan: Plan, coupon?: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const requestId = useRef(0);
  const applyCoupon = async () => {
    const currentRequest = ++requestId.current;
    const normalized = code.trim().toUpperCase();
    if (!normalized) { setPreview(null); return; }
    setChecking(true);
    try {
      // Always include the plan to select the two-argument RPC overload.
      const { data, error } = await supabase.rpc('validate_coupon_public', { _code: normalized, _plan_id: plan.id });
      if (error) throw error;
      const result = data as unknown as CouponPreview;
      if (!result || typeof result.valid !== 'boolean') throw new Error('Invalid coupon response');
      if (result.valid && (!Number.isInteger(result.final_cents) || result.final_cents! < 0)) throw new Error('Invalid coupon price');
      if (requestId.current === currentRequest) setPreview({ ...result, code: normalized });
    } catch {
      if (requestId.current === currentRequest) setPreview({ valid: false, error: 'Não foi possível validar o cupom. Tente novamente.' });
    } finally {
      if (requestId.current === currentRequest) setChecking(false);
    }
  };
  const features = Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === 'string') : [];
  const discounted = preview?.valid === true;
  return (
    <article className={`relative rounded-2xl p-8 flex flex-col border ${popular ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20'}`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] tracking-[0.25em] uppercase px-4 py-1.5 border border-white/20 rounded-full">Mais Popular</div>}
      <h3 className="text-2xl md:text-3xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{plan.name}</h3>
      <p className={`text-sm leading-relaxed mb-6 ${popular ? 'text-white/70' : 'text-neutral-600'}`}>{plan.description}</p>
      <div className="mb-6" aria-live="polite">
        {discounted && <p className={`text-sm line-through ${popular ? 'text-white/60' : 'text-neutral-500'}`}>{brl(plan.price_cents)}/mês</p>}
        <span className="text-4xl font-light">{brl(discounted ? preview.final_cents! : plan.price_cents)}/mês</span>
        <p className={`text-xs mt-2 ${popular ? 'text-white/60' : 'text-neutral-500'}`}>Cancele quando quiser. Sem fidelidade.</p>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => <li key={`${feature}-${i}`} className="flex items-start gap-3 text-sm"><Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${popular ? 'text-white' : 'text-black'}`} strokeWidth={2.5} /><span className={popular ? 'text-white/90' : 'text-neutral-800'}>{feature}</span></li>)}
      </ul>
      <form className="mb-6" onSubmit={(event) => { event.preventDefault(); void applyCoupon(); }}>
        <div className="flex items-center gap-2">
          <label htmlFor={`coupon-${plan.id}`} className="sr-only">Cupom de desconto para {plan.name}</label>
          <Input id={`coupon-${plan.id}`} value={code} placeholder="Cupom de desconto" maxLength={40} autoComplete="off" className={`min-w-0 bg-transparent uppercase text-sm placeholder:normal-case ${popular ? 'border-white/30 text-white placeholder:text-white/60' : 'border-black/20 text-black'}`} disabled={checkoutBusy}
            onChange={(event) => { ++requestId.current; setCode(event.target.value.toUpperCase()); setPreview(null); setChecking(false); }} />
          <Button type="submit" variant="outline" className="rounded-full bg-neutral-100 text-neutral-800 shrink-0" disabled={checking || checkoutBusy || !code.trim()}>{checking ? 'Validando...' : 'Aplicar'}</Button>
        </div>
        <div aria-live="polite" className="mt-2 text-xs">
          {discounted && <p className={popular ? 'text-green-300' : 'text-green-700'}>Cupom aplicado! Você pagará {brl(preview.final_cents!)} neste checkout.</p>}
          {preview && !preview.valid && <p className={popular ? 'text-red-300' : 'text-red-700'}>{preview.error || 'Cupom inválido para este plano.'}</p>}
          {code.trim() && !preview && !checking && <p className={popular ? 'text-white/60' : 'text-neutral-500'}>Clique em Aplicar para conferir o desconto.</p>}
        </div>
      </form>
      <Button variant={popular ? 'secondary' : 'default'} className={`w-full py-3 rounded-full text-sm tracking-[0.15em] uppercase transition-colors ${popular ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`} disabled={checkoutBusy || checking || (!!code.trim() && !discounted)} onClick={() => void onCheckout(plan, discounted ? preview.code : undefined)}>
        {checkoutBusy ? 'Aguarde...' : 'Assinar Agora'}
      </Button>
    </article>
  );
}

export function PricingSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const checkoutLock = useRef(false);
  const loadPlans = async () => {
    setLoading(true); setLoadError(false);
    try {
      const { data, error } = await supabase.from('plans').select('id,name,description,price_cents,features').eq('is_active', true).order('sort_order');
      if (error) throw error;
      setPlans((data ?? []) as unknown as Plan[]);
    } catch { setLoadError(true); } finally { setLoading(false); }
  };
  useEffect(() => { void loadPlans(); }, []);
  const checkout = async (plan: Plan, coupon?: string) => {
    if (!user) { navigate('/auth?mode=signup'); return; }
    if (checkoutLock.current) return;
    checkoutLock.current = true; setCheckoutBusy(true);
    try {
      const { data, error } = await invokeAuthenticatedFunction<{ init_point?: string; free?: boolean; activated?: boolean; error?: string }>('create-checkout', {
        plan_id: plan.id, coupon_code: coupon,
        success_url: `${window.location.origin}/payment-success`,
        failure_url: `${window.location.origin}/payment-failed`,
        pending_url: `${window.location.origin}/payment-success?status=pending`,
      });
      if (error || data?.error) {
        let message = data?.error || error?.message || 'Não foi possível iniciar o checkout.';
        if (error?.context instanceof Response) {
          const payload = await error.context.clone().json().catch(() => null);
          message = payload?.error || message;
        }
        throw new Error(message);
      }
      if (data?.free || data?.activated) { navigate('/account'); return; }
      if (!data?.init_point) throw new Error('Checkout indisponível. Tente novamente.');
      const target = new URL(data.init_point);
      if (target.protocol !== 'https:') throw new Error('URL de pagamento inválida.');
      window.location.assign(target.href);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Erro ao iniciar checkout.'); }
    finally { checkoutLock.current = false; setCheckoutBusy(false); }
  };
  return (
    <section id="pricing" aria-label="Planos VIRUM" className="py-20 md:py-28 bg-white scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl text-black max-w-3xl mx-auto leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Investimento estratégico em imagem e presença masculina.
          </h2>
        </div>
        {loading ? <p role="status" className="text-center text-neutral-500">Carregando planos...</p>
          : loadError ? <div className="text-center"><p role="alert">Não foi possível carregar os planos.</p><Button onClick={() => void loadPlans()} variant="outline" className="mt-4">Tentar novamente</Button></div>
          : plans.length === 0 ? <p className="text-center">Nenhum plano disponível no momento.</p>
          : <div className="max-w-6xl mx-auto grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">{plans.map((plan, index) => <motion.div key={plan.id} className="flex flex-col [&>article]:flex-1" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: index * 0.1, duration: 0.5 }}><PlanCard plan={plan} popular={index === 1} checkoutBusy={checkoutBusy} onCheckout={checkout} /></motion.div>)}</div>}
      </div>
    </section>
  );
}
