import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    id: 'ea98b794-0b43-42ea-a26a-479ab846caa7',
    name: 'Plano Essencial',
    description: 'Diagnóstico inicial com 3 recomendações de estilo mensais.',
    price: 'R$ 47,00/mês',
    features: [
      '3 diagnósticos por mês',
      'Análise de coloração pessoal',
      'Recomendações de modelagem',
    ],
    popular: false,
  },
  {
    id: 'b9ed5be2-1bb9-4e6a-9f58-bf07c45b24f7',
    name: 'Plano Premium',
    description: 'Diagnóstico avançado com 5 recomendações de estilo e alfaiataria mensais.',
    price: 'R$ 97,00/mês',
    features: [
      '5 diagnósticos por mês',
      'Curadoria de alfaiataria',
      'Consultoria e Curadoria de Alfaiataria',
      'Suporte prioritário',
    ],
    popular: true,
  },
  {
    id: '3e90ab8b-b136-49c5-b22e-2dcc7e8db717',
    name: 'Plano Elite',
    description: 'Consultoria de alto padrão com 7 recomendações exclusivas mensais.',
    price: 'R$ 197,00/mês',
    features: [
      '7 diagnósticos por mês',
      'Consultoria executiva personalizada',
      'Acesso antecipado a novos recursos',
      'Atendimento dedicado',
    ],
    popular: false,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section
      id="pricing"
      aria-label="Planos VIRUM"
      className="py-20 md:py-28 bg-white scroll-mt-24"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2
            className="text-3xl md:text-5xl text-black max-w-3xl mx-auto leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Investimento estratégico em imagem e presença masculina.
          </h2>
        </div>

        <div className="max-w-6xl mx-auto grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl p-8 flex flex-col border ${
                  isPopular
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/20'
                }`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] tracking-[0.25em] uppercase px-4 py-1.5 border border-white/20 rounded-full">
                    Mais Popular
                  </div>
                )}

                <h3
                  className="text-2xl md:text-3xl mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm leading-relaxed mb-6 ${
                    isPopular ? 'text-white/70' : 'text-neutral-600'
                  }`}
                >
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-light">{plan.price}</span>
                  <p
                    className={`text-xs mt-2 ${
                      isPopular ? 'text-white/60' : 'text-neutral-500'
                    }`}
                  >
                    Cancele quando quiser. Sem fidelidade.
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          isPopular ? 'text-white' : 'text-black'
                        }`}
                        strokeWidth={2.5}
                      />
                      <span className={isPopular ? 'text-white/90' : 'text-neutral-800'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => {
                    sessionStorage.setItem('virum:selected-plan-id', plan.id);
                    navigate(`/auth?mode=signup&plan=${encodeURIComponent(plan.id)}`);
                  }}
                  variant={isPopular ? 'secondary' : 'default'}
                  className={`w-full py-3 rounded-full text-sm tracking-[0.15em] uppercase transition-colors ${
                    isPopular
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  Assinar Agora
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
