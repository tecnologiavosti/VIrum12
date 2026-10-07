import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Users, DollarSign, Wallet, TrendingUp, CheckCircle2, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  total_affiliates: number;
  active_affiliates: number;
  total_referrals: number;
  paying_referrals: number;
  total_revenue_cents: number;
  pending_commission_cents: number;
  paid_commission_cents: number;
  commission_percent: number;
}

interface Row {
  affiliate_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  code: string;
  status: string;
  referrals_count: number;
  paying_count: number;
  total_sold_cents: number;
  total_commission_cents: number;
  paid_commission_cents: number;
  created_at: string;
}

const BRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-serif text-2xl text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminAffiliates() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [percent, setPercent] = useState<string>('20');
  const [savingPercent, setSavingPercent] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.rpc('admin_affiliate_stats'),
      supabase.rpc('admin_list_affiliates'),
    ]);
    if (s.data) {
      const st = s.data as unknown as Stats;
      setStats(st);
      setPercent(String(st.commission_percent ?? 20));
    }
    if (l.data) setRows(l.data as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(t) ||
      (r.email || '').toLowerCase().includes(t) ||
      (r.code || '').toLowerCase().includes(t),
    );
  }, [rows, q]);

  const savePercent = async () => {
    const p = Number(percent);
    if (Number.isNaN(p) || p < 0 || p > 100) {
      toast.error('Informe um valor entre 0 e 100');
      return;
    }
    setSavingPercent(true);
    const { data, error } = await supabase.rpc('admin_set_commission_percent', { _percent: p });
    setSavingPercent(false);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'Erro ao salvar');
      return;
    }
    toast.success('Percentual atualizado');
    load();
  };

  if (loading) return <div className="animate-pulse text-primary">Carregando afiliados...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-gradient-gold">Programa de Afiliados</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie afiliados, comissões e configurações.</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">Afiliados</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-4">
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Users} label="Afiliados" value={String(stats.total_affiliates)} hint={`${stats.active_affiliates} ativos`} />
              <StatCard icon={TrendingUp} label="Indicados" value={String(stats.total_referrals)} hint={`${stats.paying_referrals} pagantes`} />
              <StatCard icon={DollarSign} label="Receita gerada" value={BRL(stats.total_revenue_cents)} />
              <StatCard icon={CheckCircle2} label="Comissão paga" value={BRL(stats.paid_commission_cents)} />
              <StatCard icon={Clock} label="Comissão pendente" value={BRL(stats.pending_commission_cents)} hint="Inclui pendentes e aprovadas" />
              <StatCard icon={Wallet} label="Percentual global" value={`${stats.commission_percent}%`} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, email ou código…" className="pl-9" />
            </div>
            <div className="text-sm text-muted-foreground">{filtered.length} afiliado(s)</div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left">
                    <th className="p-4 font-medium text-muted-foreground">Nome</th>
                    <th className="p-4 font-medium text-muted-foreground">Email</th>
                    <th className="p-4 font-medium text-muted-foreground">Código</th>
                    <th className="p-4 font-medium text-muted-foreground text-right">Indicados</th>
                    <th className="p-4 font-medium text-muted-foreground text-right">Pagantes</th>
                    <th className="p-4 font-medium text-muted-foreground text-right">Vendido</th>
                    <th className="p-4 font-medium text-muted-foreground text-right">Comissão</th>
                    <th className="p-4 font-medium text-muted-foreground">Status</th>
                    <th className="p-4 font-medium text-muted-foreground">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr
                      key={r.affiliate_id}
                      className="border-t border-border/40 hover:bg-muted/30 cursor-pointer transition"
                      onClick={() => navigate(`/admin/affiliates/${r.affiliate_id}`)}
                    >
                      <td className="p-4">{r.full_name || '—'}</td>
                      <td className="p-4 text-muted-foreground">{r.email || '—'}</td>
                      <td className="p-4"><span className="font-mono text-primary">{r.code}</span></td>
                      <td className="p-4 text-right">{r.referrals_count}</td>
                      <td className="p-4 text-right">{r.paying_count}</td>
                      <td className="p-4 text-right">{BRL(r.total_sold_cents)}</td>
                      <td className="p-4 text-right font-medium">{BRL(r.total_commission_cents)}</td>
                      <td className="p-4"><Badge variant={r.status === 'active' ? 'default' : 'outline'}>{r.status}</Badge></td>
                      <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum afiliado encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="glass-card rounded-2xl p-6 max-w-md space-y-4">
            <div>
              <h3 className="font-serif text-xl text-gradient-gold">Percentual de Comissão</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aplicado a todas as novas vendas. Vendas já registradas preservam o percentual da época.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="percent">Percentual (%)</Label>
              <Input
                id="percent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={percent}
                onChange={e => setPercent(e.target.value)}
              />
            </div>
            <Button variant="premium" onClick={savePercent} disabled={savingPercent}>
              <Save className="h-4 w-4 mr-2" />
              {savingPercent ? 'Salvando...' : 'Salvar percentual'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}