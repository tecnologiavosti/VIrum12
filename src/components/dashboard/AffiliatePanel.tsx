import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, DollarSign, CheckCircle2, Clock, Wallet, TrendingUp, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Referral {
  referred_user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  plan_name: string | null;
  plan_amount_cents: number;
  commission_cents: number;
  purchase_status: string;
}

interface Data {
  has_affiliate: boolean;
  affiliate?: { id: string; code: string; status: string; created_at: string };
  referrals_count?: number;
  paying_count?: number;
  total_sold_cents?: number;
  pending_commission_cents?: number;
  approved_commission_cents?: number;
  paid_commission_cents?: number;
  referrals?: Referral[];
}

interface PaymentInfo {
  pix_key_type: string;
  pix_key: string;
  holder_name: string;
  holder_cpf: string;
}

interface Payout {
  id: string;
  amount_cents: number;
  status: string;
  payment_date: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

const BRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

const statusLabel = (s: string) => {
  switch (s) {
    case 'pending': return 'Comissão pendente';
    case 'approved': return 'Comissão aprovada';
    case 'paid': return 'Comissão paga';
    case 'canceled': return 'Cancelada';
    case 'no_purchase': return 'Sem assinatura';
    default: return s;
  }
};

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-serif text-2xl">{value}</div>
    </div>
  );
}

export function AffiliatePanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [payInfo, setPayInfo] = useState<PaymentInfo>({ pix_key_type: 'cpf', pix_key: '', holder_name: '', holder_cpf: '' });
  const [savingPay, setSavingPay] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: d, error }, { data: pi }, { data: po }] = await Promise.all([
        supabase.rpc('get_my_affiliate_dashboard'),
        supabase.rpc('get_my_affiliate_payment_info'),
        supabase.rpc('get_my_affiliate_payouts'),
      ]);
      if (error) {
        toast.error('Erro ao carregar dados de afiliado');
      } else {
        setData(d as unknown as Data);
      }
      if (pi && typeof pi === 'object') {
        const info = pi as unknown as PaymentInfo;
        setPayInfo({
          pix_key_type: info.pix_key_type || 'cpf',
          pix_key: info.pix_key || '',
          holder_name: info.holder_name || '',
          holder_cpf: info.holder_cpf || '',
        });
      }
      if (Array.isArray(po)) setPayouts(po as unknown as Payout[]);
      setLoading(false);
    })();
  }, []);

  const savePaymentInfo = async () => {
    setSavingPay(true);
    const { data: res } = await supabase.rpc('upsert_my_affiliate_payment_info', {
      _pix_key_type: payInfo.pix_key_type,
      _pix_key: payInfo.pix_key,
      _holder_name: payInfo.holder_name,
      _holder_cpf: payInfo.holder_cpf,
    });
    setSavingPay(false);
    const r = res as { success?: boolean; error?: string } | null;
    if (!r?.success) { toast.error(r?.error || 'Erro ao salvar'); return; }
    toast.success('Dados de recebimento salvos');
  };

  const openReceipt = async (path: string) => {
    const { data: signed, error } = await supabase.storage
      .from('affiliate-receipts')
      .createSignedUrl(path, 60 * 5);
    if (error || !signed?.signedUrl) { toast.error('Erro ao abrir comprovante'); return; }
    window.open(signed.signedUrl, '_blank');
  };

  const copyCode = async () => {
    if (!data?.affiliate?.code) return;
    await navigator.clipboard.writeText(data.affiliate.code);
    toast.success('Código copiado!');
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Carregando programa de afiliados...</div>;
  }

  if (!data?.has_affiliate) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">Seu registro de afiliado ainda não foi criado. Tente atualizar a página em alguns instantes.</p>
      </div>
    );
  }

  const a = data.affiliate!;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Programa de Afiliados</h2>
        <p className="text-muted-foreground mt-1">Indique novos clientes e receba comissão em cada plano contratado.</p>
      </div>

      {/* Código */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Seu código de afiliado</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-3xl tracking-widest text-primary">{a.code}</span>
              <Badge variant={a.status === 'active' ? 'default' : 'outline'}>{a.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Compartilhe seu código. Cada nova assinatura de quem usar seu código gera comissão para você.
            </p>
          </div>
          <Button variant="premium" onClick={copyCode} className="shrink-0">
            <Copy className="h-4 w-4 mr-2" /> Copiar código
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Indicados" value={String(data.referrals_count ?? 0)} />
        <Stat icon={TrendingUp} label="Clientes pagantes" value={String(data.paying_count ?? 0)} />
        <Stat icon={DollarSign} label="Valor vendido" value={BRL(data.total_sold_cents ?? 0)} />
        <Stat icon={Clock} label="Comissão pendente" value={BRL(data.pending_commission_cents ?? 0)} />
        <Stat icon={Wallet} label="Comissão aprovada" value={BRL(data.approved_commission_cents ?? 0)} />
        <Stat icon={CheckCircle2} label="Comissão paga" value={BRL(data.paid_commission_cents ?? 0)} />
      </div>

      {/* Dados de Recebimento */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="font-serif text-xl">Dados de Recebimento</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Informe seus dados PIX para receber as comissões. Você pode alterá-los a qualquer momento.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Tipo de chave PIX</Label>
            <Select value={payInfo.pix_key_type} onValueChange={v => setPayInfo({ ...payInfo, pix_key_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave Aleatória</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chave PIX</Label>
            <Input value={payInfo.pix_key} onChange={e => setPayInfo({ ...payInfo, pix_key: e.target.value })} maxLength={140} />
          </div>
          <div>
            <Label>Nome do titular</Label>
            <Input value={payInfo.holder_name} onChange={e => setPayInfo({ ...payInfo, holder_name: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label>CPF do titular</Label>
            <Input value={payInfo.holder_cpf} onChange={e => setPayInfo({ ...payInfo, holder_cpf: e.target.value })} maxLength={14} placeholder="000.000.000-00" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="premium" onClick={savePaymentInfo} disabled={savingPay}>
            <Save className="h-4 w-4 mr-2" /> {savingPay ? 'Salvando...' : 'Salvar dados'}
          </Button>
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="font-serif text-xl">Histórico de Pagamentos</h3>
          <p className="text-sm text-muted-foreground mt-1">Pagamentos de comissão registrados pela administração.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-4 font-medium text-muted-foreground">Data</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Valor</th>
                <th className="p-4 font-medium text-muted-foreground">Período</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="p-4 text-muted-foreground">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('pt-BR') : new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-right font-medium">{BRL(p.amount_cents)}</td>
                  <td className="p-4 text-muted-foreground">
                    {p.period_start && p.period_end
                      ? `${new Date(p.period_start).toLocaleDateString('pt-BR')} - ${new Date(p.period_end).toLocaleDateString('pt-BR')}`
                      : '—'}
                  </td>
                  <td className="p-4"><Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status === 'paid' ? 'Pago' : p.status}</Badge></td>
                  <td className="p-4">
                    {p.receipt_url ? (
                      <Button variant="ghost" size="sm" onClick={() => openReceipt(p.receipt_url!)}>
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum pagamento registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indicados */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="font-serif text-xl">Pessoas indicadas</h3>
          <p className="text-sm text-muted-foreground mt-1">Todos os usuários que criaram conta usando seu código.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-4 font-medium text-muted-foreground">Nome</th>
                <th className="p-4 font-medium text-muted-foreground">E-mail</th>
                <th className="p-4 font-medium text-muted-foreground">Cadastro</th>
                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Valor</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Comissão</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.referrals ?? []).map(r => (
                <tr key={r.referred_user_id} className="border-t border-border/40">
                  <td className="p-4">{r.full_name || '—'}</td>
                  <td className="p-4 text-muted-foreground">{r.email || '—'}</td>
                  <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">{r.plan_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4 text-right">{r.plan_amount_cents ? BRL(r.plan_amount_cents) : '—'}</td>
                  <td className="p-4 text-right font-medium">{r.commission_cents ? BRL(r.commission_cents) : '—'}</td>
                  <td className="p-4">
                    <Badge variant={r.purchase_status === 'paid' || r.purchase_status === 'approved' ? 'default' : 'outline'}>
                      {statusLabel(r.purchase_status)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(data.referrals ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Você ainda não tem indicações. Compartilhe seu código para começar!
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}