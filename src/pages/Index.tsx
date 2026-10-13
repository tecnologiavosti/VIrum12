import { WhatsAppCTA } from '@/components/WhatsAppCTA';
import { useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Camera, Palette, Shirt, Crown, ArrowRight, Star, Quote, Users, Zap, Shield, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageTransition, fadeInUp, staggerContainer } from '@/components/layout/PageTransition';
import { PricingSection } from '@/components/PricingSection';
import { HomeBlogSection } from '@/components/blog/HomeBlogSection';
import { SEOHead } from '@/components/seo/SEOHead';
import heroManImg from '@/assets/hero-man.png';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VIRUM',
  url: 'https://virum.com.br',
  logo: 'https://virum.com.br/virum-logo.svg',
  description:
    'Consultoria de imagem pessoal com inteligência artificial: 7 IAs analisam estilo, corpo, cores e guarda-roupa.',
};
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'VIRUM',
  url: 'https://virum.com.br',
  inLanguage: 'pt-BR',
};
const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'VIRUM',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '47.00', priceCurrency: 'BRL' },
};

const features = [
  { icon: Camera, title: 'Análise Corporal', desc: 'Biotipo, proporções e silhueta ideal identificados com precisão.' },
  { icon: Palette, title: 'Coloração Pessoal', desc: 'Sua paleta de cores ideal que harmoniza com sua pele, olhos e cabelo.' },
  { icon: Star, title: 'Perfil de Estilo', desc: 'Identidade autêntica mapeada por comportamento e preferências.' },
  { icon: Shirt, title: 'Guarda-Roupa Cápsula', desc: 'Peças essenciais e looks prontos otimizados para sua rotina.' },
];

const analysisSteps = [
  { icon: Eye, title: 'Análise Corporal', color: 'from-amber-500/20 to-amber-600/5' },
  { icon: Palette, title: 'Coloração', color: 'from-rose-500/20 to-rose-600/5' },
  { icon: Star, title: 'Estilo', color: 'from-violet-500/20 to-violet-600/5' },
  { icon: Shirt, title: 'Modelagens', color: 'from-emerald-500/20 to-emerald-600/5' },
  { icon: Shield, title: 'Essenciais', color: 'from-sky-500/20 to-sky-600/5' },
  { icon: Crown, title: 'Cápsula', color: 'from-primary/20 to-primary/5' },
  { icon: Sparkles, title: 'Diagnóstico Final', color: 'from-primary/30 to-primary/10' },
];

const testimonials = [
  { name: 'Leonardo S.', text: 'A VIRUM superou minhas expectativas. A curadoria de alfaiataria é cirúrgica — entendeu meu posicionamento executivo melhor do que qualquer consultor que já contratei.', role: 'Empresário' },
  { name: 'Roberto T.', text: 'O diagnóstico identificou exatamente o nível de sofisticação que minha imagem precisava. Hoje cada peça do meu guarda-roupa comunica autoridade e refinamento.', role: 'Diretor Executivo' },
  { name: 'Carlos M.', text: 'Inteligência impressionante. A paleta, as modelagens e a seleção de tecidos elevaram meu padrão. Indispensável para quem leva imagem pessoal a sério.', role: 'Advogado Associado' },
];

const stats = [
  { value: '7', label: 'IAs Especializadas' },
  { value: '30+', label: 'Páginas de Análise' },
  { value: '100%', label: 'Personalizado' },
  { value: '5min', label: 'Tempo de Resultado' },
];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);

  return (
    <PageTransition>
      <SEOHead
        title="VIRUM — Diagnóstico de Imagem Pessoal com IA para moda masculina"
        description="7 IAs analisam seu corpo, cores e estilo e criam um diagnóstico completo de imagem masculina com paleta, modelagens e guarda-roupa cápsula."
        canonicalPath="/"
        jsonLd={[organizationSchema, websiteSchema, webAppSchema]}
      />
      <Layout>
        <div className="relative overflow-hidden">
          {/* Hero Section */}
          <section aria-label="Apresentação" className="relative min-h-[92vh] flex items-center py-20 overflow-hidden">
            {/* Background image */}
            <img
              src={heroManImg}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-[75%_top] md:object-[72%_top]"
            />
            {/* Overlays: darkening + left→right gradient + vignette + brand tint */}
            <div className="absolute inset-0 bg-background/30 md:bg-background/15" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 md:via-background/50 to-transparent md:to-background/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.12),transparent_55%)]" />
            <div className="absolute inset-0 [box-shadow:inset_0_0_140px_40px_hsl(var(--background)/0.55)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <motion.div
              className="container mx-auto px-4 text-left md:max-w-[60%] lg:max-w-[55%] md:mr-auto md:ml-0 md:pl-8 lg:pl-16 relative z-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm text-primary font-medium tracking-wide">Diagnóstico de Imagem com IA</span>
              </motion.div>
              <motion.h1
                className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-8 leading-[1.05]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Descubra seu <br />
                <span className="text-gradient-gold">Estilo Único</span>
              </motion.h1>
              <motion.p
                className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                7 inteligências artificiais analisam sua imagem pessoal e criam um diagnóstico completo e exclusivo para você
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-start mb-16"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.4 }}
              >
                <Button variant="premium" size="lg" onClick={() => navigate('/auth?mode=signup')} className="text-lg px-10 py-6 shadow-[0_0_30px_hsl(43,74%,49%,0.2)]">
                  Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <WhatsAppCTA className="text-lg px-8 py-6" label="Tire suas dúvidas" />
                <Button variant="outline" size="lg" onClick={() => navigate('/how-it-works')} className="text-lg px-10 py-6 border-border/80">
                  Como Funciona
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats Bar — glass panel pinned to bottom of hero */}
            <motion.div
              className="absolute bottom-6 left-4 right-4 md:left-8 md:right-8 lg:left-16 lg:right-16 z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5 }}
            >
              <div className="mx-auto max-w-5xl rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl shadow-[0_20px_60px_-20px_hsl(0,0%,0%,0.6)] px-4 py-4 md:px-6 md:py-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="font-serif text-2xl md:text-3xl text-primary">{s.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* 7 Analysis Pipeline */}
          <section aria-label="Pipeline de análise" className="py-20 md:py-28 relative">
            <div className="absolute inset-0 bg-secondary" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-4">
                  <span className="text-gradient-gold">7 Análises</span> em Sequência
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Cada IA é especializada em um aspecto da sua imagem, trabalhando em conjunto para um resultado completo.
                </p>
              </motion.div>
              <motion.div
                className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-4xl mx-auto"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-60px" }}
              >
                {analysisSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className={`flex items-center gap-3 bg-background border border-border rounded-2xl px-5 py-4 md:px-6 md:py-5`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Etapa {i + 1}</span>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <section aria-label="Recursos" className="py-20 md:py-28 bg-card/30">
            <div className="container mx-auto px-4">
              <motion.h2
                className="font-serif text-3xl sm:text-4xl md:text-5xl text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
              >
                O que você <span className="text-gradient-gold">recebe</span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-center max-w-xl mx-auto mb-16"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Um diagnóstico completo com análises detalhadas e recomendações práticas.
              </motion.p>
              <motion.div
                className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-60px" }}
              >
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className="glass-card rounded-2xl p-8 text-center hover:border-primary/40 transition-all"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <f.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl mb-3">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Testimonials */}
          <section aria-label="Depoimentos" className="py-20 md:py-28 relative">
            <div className="absolute inset-0 bg-secondary" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
              >
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-4">
                  O que dizem nossos <span className="text-gradient-gold">clientes</span>
                </h2>
              </motion.div>
              <motion.div
                className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-60px" }}
              >
                {testimonials.map((t, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className="glass-card rounded-2xl p-8 relative"
                  >
                    <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                      ))}
                    </div>
                    <p className="text-foreground/90 text-sm leading-relaxed mb-6 italic">
                      "{t.text}"
                    </p>
                    <div className="border-t border-border/50 pt-4">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Benefits / Why */}
          <section aria-label="Benefícios" className="py-20 md:py-28 bg-card/30">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl mb-8">
                    Por que escolher a <span className="text-gradient-gold">VIRUM</span>?
                  </h2>
                  <div className="space-y-5">
                    {[
                      { icon: Zap, text: 'Análise completa em minutos, não semanas' },
                      { icon: Users, text: 'Recomendações 100% personalizadas para você' },
                      { icon: Shirt, text: 'Guarda-roupa cápsula com looks prontos' },
                      { icon: Shield, text: 'Suas fotos seguras e privadas' },
                      { icon: Crown, text: '7 IAs especializadas em consultoria de moda.' },
                    ].map((b, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-4"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <b.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-foreground/90 text-base leading-relaxed">{b.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="glass-card rounded-3xl p-10 text-center"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-serif text-2xl mb-3">Diagnóstico Completo</h3>
                  <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                    Corpo, cores, estilo, modelagens, peças essenciais e guarda-roupa cápsula — tudo em um único diagnóstico.
                  </p>
                  <Button variant="premium" size="lg" onClick={() => navigate('/auth?mode=signup')} className="w-full shadow-[0_0_30px_hsl(43,74%,49%,0.15)]">
                    Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <PricingSection />

          {/* Últimas do Blog */}
          <HomeBlogSection />

          {/* Final CTA */}
          <section aria-label="CTA final" className="py-24 md:py-32 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />
            <div className="container mx-auto px-4 relative z-10 text-center">
              <motion.h2
                className="font-serif text-3xl sm:text-4xl md:text-5xl mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Pronto para sua <span className="text-gradient-gold">transformação</span>?
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Sua jornada de autoconhecimento começa agora. Descubra o poder da imagem pessoal com IA.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <WhatsAppCTA className="text-lg px-10 py-6" label="Fale com a VIRUM" />
                <Button variant="premium" size="lg" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-lg px-10 py-6 shadow-[0_0_40px_hsl(43,74%,49%,0.2)]">
                  <Crown className="mr-2 h-5 w-5" /> Ver Planos e Começar
                </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </Layout>
    </PageTransition>
  );
};

export default Index;
