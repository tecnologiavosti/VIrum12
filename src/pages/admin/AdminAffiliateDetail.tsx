import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, DollarSign, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Commission {
  id: string;
  referred_name: string | null;
  referred_email: string | null;
  plan_name: string | null;
  plan_amount_cents: number;
  commission_percent: number;
  commission_cents: number;
  status: string;
  created_at: string;
}
interface Referral {
  referred_user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  code_used: string;
  has_paid: boolean;
}
interface Payout {
  id: string;
  amount_cents: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  payment_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  receipt_url?: string | null;
}
interface PaymentInfo {
  pix_key_type: string;
  pix_key: string;
  holder_name: string;
  holder_cpf: string;
}
interface Detail {
  affiliate: { id: string; user_id: string; full_name: string | null; email: string | null; code: string; status: string; created_at: string };
  payment_info: PaymentInfo | null;
  referrals_count: number;
  paying_count: number;
  total_sold_cents: number;
  pending_commission_cents: number;
  paid_commission_cents: number;
  referrals: Referral[];
  commissions: Commission[];
  payouts: Payout[];
}

const BRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

export default function AdminAffiliateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    notes: '',
    markPaid: true,
    payment_date: new Date().toISOString().slice(0, 10),
    period_start: '',
    period_end: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [payoutSaving, setPayoutSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: d } = await supabase.rpc('admin_get_affiliate_detail', { _affiliate_id: id });
    if (d) {
      const det = d as unknown as Detail;
      setData(det);
      setNewCode(det.affiliate.code);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const saveCode = async () => {
    if (!id) return;
    setSavingCode(true);
    const { data: res, error } = await supabase.rpc('admin_update_affiliate_code', { _affiliate_id: id, _new_code: newCode });
    setSavingCode(false);
    const r = res as { success?: boolean; error?: string } | null;
    if (error || !r?.success) {
      toast.error(r?.error || error?.message || 'Erro ao atualizar código');
      return;
    }
    toast.success('Código atualizado');
    load();
  };

  const toggleStatus = async () => {
    if (!data) return;
    const next = data.affiliate.status === 'active' ? 'inactive' : 'active';
    const { data: res } = await supabase.rpc('admin_set_affiliate_status', { _affiliate_id: data.affiliate.id, _status: next });
    const r = res as { success?: boolean; error?: string } | null;
    if (!r?.success) { toast.error(r?.error || 'Erro'); return; }
    toast.success('Status atualizado');
    load();
  };

  const updateCommission = async (commissionId: string, status: string) => {
    const { data: res } = await supabase.rpc('admin_update_commission_status', { _commission_id: commissionId, _status: status });
    const r = res as { success?: boolean; error?: string } | null;
    if (!r?.success) { toast.error(r?.error || 'Erro'); return; }
    toast.success('Comissão atualizada');
    load();
  };

  const createPayout = async () => {
    if (!data) return;
    const amount = Math.round(parseFloat(payoutForm.amount) * 100);
    if (!amount || amount <= 0) { toast.error('Valor inválido'); return; }
    setPayoutSaving(true);

    let receiptUrl: string | null = null;
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()?.toLowerCase() || 'bin';
      if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        setPayoutSaving(false);
        toast.error('Formato inválido. Envie PDF, PNG ou JPG.');
        return;
      }
      const path = `${data.affiliate.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('affiliate-receipts')
        .upload(path, receiptFile, { contentType: receiptFile.type, upsert: false });
      if (upErr) {
        setPayoutSaving(false);
        toast.error('Erro ao enviar comprovante');
        return;
      }
      receiptUrl = path;
    }

    const { data: res } = await supabase.rpc('admin_create_affiliate_payout', {
      _affiliate_id: data.affiliate.id,
      _amount_cents: amount,
      _notes: payoutForm.notes || null,
      _mark_approved_as_paid: payoutForm.markPaid,
      _receipt_url: receiptUrl,
      _payment_date: payoutForm.payment_date || null,
      _period_start: payoutForm.period_start || null,
      _period_end: payoutForm.period_end || null,
    });
    setPayoutSaving(false);
    const r = res as { success?: boolean; error?: string } | null;
    if (!r?.success) { toast.error(r?.error || 'Erro'); return; }
    toast.success('Pagamento registrado');
    setPayoutOpen(false);
    setPayoutForm({ amount: '', notes: '', markPaid: true, payment_date: new Date().toISOString().slice(0, 10), period_start: '', period_end: '' });
    setReceiptFile(null);
    load();
  };

  const openReceipt = async (path: string) => {
    const { data: signed, error } = await supabase.storage
      .from('affiliate-receipts')
      .createSignedUrl(path, 60 * 5);
    if (error || !signed?.signedUrl) { toast.error('Erro ao abrir comprovante'); return; }
    window.open(signed.signedUrl, '_blank');
  };

  const pixTypeLabel = (t?: string) => ({ cpf: 'CPF', email: 'E-mail', phone: 'Telefone', random: 'Chave Aleatória' } as Record<string,string>)[t || ''] || t || '—';

  const pendingCommissionsForPayout = data ? (data.commissions.filter(c => c.status === 'pending' || c.status === 'approved')) : [];

  if (loading) return <div className="animate-pulse text-primary">Carregando...</div>;
  if (!data) return <div className="text-muted-foreground">Afiliado não encontrado.</div>;

  const a = data.affiliate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/affiliates')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="font-serif text-3xl text-gradient-gold">{a.full_name || 'Sem nome'}</h2>
          <p className="text-sm text-muted-foreground">{a.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleStatus}>
            {a.status === 'active' ? 'Desativar' : 'Ativar'}
          </Button>
          <Button variant="premium" onClick={() => setPayoutOpen(true)}>
            <DollarSign className="h-4 w-4 mr-2" /> Registrar pagamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Indicados</div>
          <div className="font-serif text-2xl">{data.referrals_count}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Pagantes</div>
          <div className="font-serif text-2xl">{data.paying_count}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Vendido</div>
          <div className="font-serif text-2xl">{BRL(data.total_sold_cents)}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Comissão pendente</div>
          <div className="font-serif text-2xl">{BRL(data.pending_commission_cents)}</div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Comissão paga</div>
          <div className="font-serif text-2xl">{BRL(data.paid_commission_cents)}</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 max-w-xl space-y-3">
        <h3 className="font-serif text-xl">Código de Afiliado</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="code">Código</Label>
            <Input id="code" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="font-mono tracking-wider" maxLength={20} />
          </div>
          <Button variant="premium" onClick={saveCode} disabled={savingCode || newCode === a.code}>
            <Save className="h-4 w-4 mr-2" /> {savingCode ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Somente admins podem alterar. O sistema valida se o código já está em uso.</p>
      </div>

      {/* Dados para Pagamento (PIX) */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <h3 className="font-serif text-xl">Dados para Pagamento</h3>
        {data.payment_info ? (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><div className="text-muted-foreground text-xs uppercase tracking-wider">Nome do titular</div><div>{data.payment_info.holder_name}</div></div>
            <div><div className="text-muted-foreground text-xs uppercase tracking-wider">CPF</div><div className="font-mono">{data.payment_info.holder_cpf}</div></div>
            <div><div className="text-muted-foreground text-xs uppercase tracking-wider">Tipo de chave PIX</div><div>{pixTypeLabel(data.payment_info.pix_key_type)}</div></div>
            <div><div className="text-muted-foreground text-xs uppercase tracking-wider">Chave PIX</div><div className="font-mono break-all">{data.payment_info.pix_key}</div></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">O afiliado ainda não cadastrou os dados de recebimento.</p>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/40 font-serif text-lg">Pessoas indicadas ({data.referrals.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3 font-medium text-muted-foreground">Nome</th>
                <th className="p-3 font-medium text-muted-foreground">Email</th>
                <th className="p-3 font-medium text-muted-foreground">Cadastro</th>
                <th className="p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.map(r => (
                <tr key={r.referred_user_id} className="border-t border-border/40">
                  <td className="p-3">{r.full_name || '—'}</td>
                  <td className="p-3 text-muted-foreground">{r.email || '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <Badge variant={r.has_paid ? 'default' : 'outline'}>
                      {r.has_paid ? 'Cliente pagante' : 'Sem assinatura'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data.referrals.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhuma indicação ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/40 font-serif text-lg">Comissões ({data.commissions.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3 font-medium text-muted-foreground">Data</th>
                <th className="p-3 font-medium text-muted-foreground">Cliente</th>
                <th className="p-3 font-medium text-muted-foreground">Plano</th>
                <th className="p-3 font-medium text-muted-foreground text-right">Valor</th>
                <th className="p-3 font-medium text-muted-foreground text-right">%</th>
                <th className="p-3 font-medium text-muted-foreground text-right">Comissão</th>
                <th className="p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions.map(c => (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="p-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">{c.referred_name || c.referred_email || '—'}</td>
                  <td className="p-3">{c.plan_name || '—'}</td>
                  <td className="p-3 text-right">{BRL(c.plan_amount_cents)}</td>
                  <td className="p-3 text-right">{Number(c.commission_percent)}%</td>
                  <td className="p-3 text-right font-medium">{BRL(c.commission_cents)}</td>
                  <td className="p-3">
                    <Select value={c.status} onValueChange={(v) => updateCommission(c.id, v)}>
                      <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="approved">Aprovada</SelectItem>
                        <SelectItem value="paid">Paga</SelectItem>
                        <SelectItem value="canceled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {data.commissions.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma comissão ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border/40 font-serif text-lg">Histórico de pagamentos ({data.payouts.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3 font-medium text-muted-foreground">Data</th>
                <th className="p-3 font-medium text-muted-foreground text-right">Valor</th>
                <th className="p-3 font-medium text-muted-foreground">Período</th>
                <th className="p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3 font-medium text-muted-foreground">Observações</th>
                <th className="p-3 font-medium text-muted-foreground">Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {data.payouts.map(p => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="p-3 text-muted-foreground">{new Date(p.payment_date || p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 text-right font-medium">{BRL(p.amount_cents)}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.period_start && p.period_end
                      ? `${new Date(p.period_start).toLocaleDateString('pt-BR')} - ${new Date(p.period_end).toLocaleDateString('pt-BR')}`
                      : '—'}
                  </td>
                  <td className="p-3"><Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{p.notes || '—'}</td>
                  <td className="p-3">
                    {p.receipt_url ? (
                      <Button variant="ghost" size="sm" onClick={() => openReceipt(p.receipt_url!)}>
                        <FileText className="h-4 w-4 mr-1" /> Ver
                      </Button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {data.payouts.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum pagamento registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif text-2xl">Registrar pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {pendingCommissionsForPayout.length > 0 && (
              <div className="rounded-lg border border-border/40 p-3 bg-muted/20 text-xs">
                <div className="font-medium mb-1">Comissões pendentes/aprovadas: {pendingCommissionsForPayout.length}</div>
                <div className="text-muted-foreground">
                  Total: {BRL(pendingCommissionsForPayout.reduce((s, c) => s + c.commission_cents, 0))}
                </div>
                <button
                  type="button"
                  className="text-primary underline mt-1"
                  onClick={() => setPayoutForm({ ...payoutForm, amount: (pendingCommissionsForPayout.reduce((s, c) => s + c.commission_cents, 0) / 100).toFixed(2) })}
                >
                  Usar este valor
                </button>
              </div>
            )}
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={payoutForm.amount} onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Data do pagamento</Label>
              <Input type="date" value={payoutForm.payment_date} onChange={e => setPayoutForm({ ...payoutForm, payment_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Período — início</Label>
                <Input type="date" value={payoutForm.period_start} onChange={e => setPayoutForm({ ...payoutForm, period_start: e.target.value })} />
              </div>
              <div>
                <Label>Período — fim</Label>
                <Input type="date" value={payoutForm.period_end} onChange={e => setPayoutForm({ ...payoutForm, period_end: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={payoutForm.notes} onChange={e => setPayoutForm({ ...payoutForm, notes: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Comprovante (PDF, PNG ou JPG)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                />
                {receiptFile && <span className="text-xs text-muted-foreground truncate max-w-[150px]"><Upload className="inline h-3 w-3 mr-1" />{receiptFile.name}</span>}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={payoutForm.markPaid} onChange={e => setPayoutForm({ ...payoutForm, markPaid: e.target.checked })} />
              Marcar todas as comissões pendentes/aprovadas como pagas
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)}>Cancelar</Button>
            <Button variant="premium" onClick={createPayout} disabled={payoutSaving}>
              {payoutSaving ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}