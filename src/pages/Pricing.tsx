import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PricingSection } from '@/components/PricingSection';
import { useAuth } from '@/hooks/useAuth';

export default function Pricing() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/#pricing" replace />;

  return (
    <Layout showFooter={false}>
      <div className="mx-auto max-w-3xl px-4 pt-7 lg:pt-12">
        <h1 className="font-serif text-3xl lg:text-4xl">Escolha seu plano</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Encontre a experiência de diagnóstico ideal para você.
        </p>
      </div>
      <PricingSection />
    </Layout>
  );
}
