import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [planName, setPlanName] = useState('');
  const [checkError, setCheckError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase.from('subscriptions')
        .select('status,current_period_end,plans(name)').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      setCheckError(!!error);
      if (error) return;
      const active = data?.status === 'active' && (!data.current_period_end || new Date(data.current_period_end).getTime() > Date.now());
      setConfirmed(active);
      setPlanName((data?.plans as { name?: string } | null)?.name || '');
    };
    void check();
    const timer = window.setInterval(() => void check(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [user]);

  return (
    <Layout>
      <section className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center" aria-live="polite">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            {confirmed ? <CheckCircle className="h-10 w-10 text-primary" /> : <Clock className="h-10 w-10 text-primary" />}
          </div>
          <h1 className="font-serif text-4xl mb-4">{confirmed ? 'Assinatura confirmada!' : 'Aguardando confirmação do pagamento'}</h1>
          <p className="text-muted-foreground mb-8">
            {confirmed
              ? `${planName || 'Seu plano'} está ativo. Você já pode iniciar seus diagnósticos.`
              : checkError
                ? 'Não foi possível consultar a assinatura agora. Tentaremos novamente automaticamente.'
                : 'Assim que o pagamento for aprovado e confirmado, seu plano será atualizado automaticamente no dashboard. Não é necessário pagar novamente.'}
          </p>
          <Button variant="premium" size="lg" onClick={() => navigate('/account')}><ArrowRight className="mr-2 h-5 w-5" />Ir para o Dashboard</Button>
        </div>
      </section>
    </Layout>
  );
}
