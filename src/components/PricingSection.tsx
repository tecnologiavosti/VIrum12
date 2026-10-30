import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WhatsAppCTA } from '@/components/WhatsAppCTA';
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
const goldButton = 'bg-[#b18d40] text-white hover:bg-[#987632] rounded-2xl shadow-[0_10px_24px_-8px_#b18d4080]';

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
    <article className={`relative flex flex-col rounded-3xl border bg-white p-7 sm:p-10 text-[#37352f] shadow-[0_8px_40px_-20px_#b18d4050] ${popular ? 'border-[#b18d4070]' : 'border-[#b18d4030]'}`}>
      {popular && <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-3xl bg-[#b18d40] px-5 py-2 text-xs font-semibold text-white">Mais Popular</span>}
      <div className="flex items-start gap-3 mb-7 mt-2">
        <span className="rounded-xl bg-[#eee7d7] p-3 text-[#b18d40]"><Sparkles className="h-6 w-6" /></span>
        <div><h3 className="font-serif text-2xl font-semibold">{plan.name}</h3><p className="mt-1 text-sm text-neutral-500">{plan.description}</p></div>
      </div>
      <div className="mb-7" aria-live="polite">
        {discounted && <p className="text-sm text-neutral-500 line-through">{brl(plan.price_cents)}</p>}
        <p><span className="font-serif text-4xl text-[#b18d40]">{brl(discounted ? preview.final_cents! : plan.price_cents)}</span><span className="ml-2 text-sm text-neutral-500">/mês</span></p>
        <p className="mt-2 text-sm text-neutral-500">Cancele quando quiser. Sem fidelidade.</p>
      </div>
      <ul className="flex-1 space-y-4 mb-8">
        {features.map((feature, i) => <li key={`${feature}-${i}`} className="flex items-start gap-3 text-sm"><Check className="h-5 w-5 shrink-0 rounded-full bg-[#eee7d7] p-1 text-[#b18d40]" />{feature}</li>)}
      </ul>
      <form className="mb-6" onSubmit={(event) => { event.preventDefault(); void applyCoupon(); }}>
        <div className="flex items-center gap-2">
          <label htmlFor={`coupon-${plan.id}`} className="sr-only">Cupom de desconto para {plan.name}</label>
          <Input id={`coupon-${plan.id}`} value={code} placeholder="Cupom de desconto" maxLength={40} autoComplete="off" className="min-w-0 border-0 bg-transparent shadow-none placeholder:normal-case uppercase text-sm" disabled={checkoutBusy}
            onChange={(event) => { ++requestId.current; setCode(event.target.value.toUpperCase()); setPreview(null); setChecking(false); }} />
          <Button type="submit" variant="outline" className="rounded-full bg-neutral-100 text-neutral-800 shrink-0" disabled={checking || checkoutBusy || !code.trim()}>{checking ? 'Validando...' : 'Aplicar'}</Button>
        </div>
        <div aria-live="polite" className="mt-2 text-xs">
          {discounted && <p className="text-green-700">Cupom aplicado! Você pagará {brl(preview.final_cents!)} neste checkout.</p>}
          {preview && !preview.valid && <p className="text-red-700">{preview.error || 'Cupom inválido para este plano.'}</p>}
          {code.trim() && !preview && !checking && <p className="text-neutral-500">Clique em Aplicar para conferir o desconto.</p>}
        </div>
      </form>
      <Button className={`w-full h-14 ${goldButton}`} disabled={checkoutBusy || checking || (!!code.trim() && !discounted)} onClick={() => void onCheckout(plan, discounted ? preview.code : undefined)}>
        <Zap className="mr-2 h-4 w-4" />{checkoutBusy ? 'Aguarde...' : 'Assinar Agora'}
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
    <section id="pricing" aria-label="Planos VIRUM" className="bg-[#fdfcf9] py-16 md:py-20 scroll-mt-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-serif text-4xl md:text-6xl text-[#b18d40]">Escolha seu Plano</h2>
          <p className="mt-5 text-neutral-500 text-lg">Invista em autoconhecimento e transforme sua imagem pessoal com nossa análise completa.</p>
          <WhatsAppCTA label="Precisa de ajuda? Fale no WhatsApp" className="mt-6 border border-[#b18d40] bg-white text-[#b18d40] hover:bg-[#eee7d7] rounded-2xl text-xs sm:text-sm" />
        </div>
        {loading ? <p role="status" className="text-center text-neutral-500">Carregando planos...</p>
          : loadError ? <div className="text-center"><p role="alert">Não foi possível carregar os planos.</p><Button onClick={() => void loadPlans()} variant="outline" className="mt-4">Tentar novamente</Button></div>
          : plans.length === 0 ? <p className="text-center">Nenhum plano disponível no momento.</p>
          : <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">{plans.map((plan, index) => <PlanCard key={plan.id} plan={plan} popular={index === 1} checkoutBusy={checkoutBusy} onCheckout={checkout} />)}</div>}
      </div>
    </section>
  );
}
