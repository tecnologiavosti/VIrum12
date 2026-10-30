import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PricingSection } from '@/components/PricingSection';
import { useAuth } from '@/hooks/useAuth';

export default function Pricing() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Layout showFooter={false}>
      <PricingSection />
    </Layout>
  );
}
