import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, ShieldOff, ShieldCheck, Trash2, RotateCcw, Ban, Gift } from 'lucide-react';
import { toast } from 'sonner';

const BRL = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

interface Plan { id: string; name: string; price_cents: number }

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grantPlanId, setGrantPlanId] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [d, p] = await Promise.all([
      supabase.rpc('admin_get_user_detail', { _user_id: id }),
      supabase.from('plans').select('id,name,price_cents').eq('is_active', true).order('sort_order'),
    ]);
    if (d.data) {
      setData(d.data);
      setFullName((d.data as any).profile?.full_name || '');
      setPhone((d.data as any).profile?.phone || (d.data as any).auth?.phone || '');
      setEmail((d.data as any).auth?.email || '');
    }
    if (p.data) setPlans(p.data);
    setLoading(false);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const saveProfile = async () => {
    setSaving(true);
    await supabase.rpc('admin_update_profile', { _user_id: id, _full_name: fullName, _phone: phone });
    if (email && email !== data?.auth?.email || password) {
      const { error } = await supabase.functions.invoke('admin-user-manage', {
        body: { action: 'update_auth', user_id: id, email: email || undefined, password: password || undefined, phone: phone || undefined },
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      setPassword('');
    }
    toast.success('Usuário atualizado');
    setSaving(false);
    load();
  };

  const toggleSuspend = async () => {
    const action = data?.profile?.is_suspended ? 'reactivate' : 'suspend';
    const { error } = await supabase.functions.invoke('admin-user-manage', { body: { action, user_id: id } });
    if (error) { toast.error(error.message); return; }
    toast.success(action === 'suspend' ? 'Usuário suspenso' : 'Usuário reativado');
    load();
  };

  const deleteUser = async () => {
    if (!confirm('Excluir este usuário permanentemente? Esta ação é irreversível.')) return;
    const { error } = await supabase.functions.invoke('admin-user-manage', { body: { action: 'delete', user_id: id } });
    if (error) { toast.error(error.message); return; }
    toast.success('Usuário excluído');
    navigate('/admin/users');
  };

  const grantPlan = async () => {
    if (!grantPlanId) return;
    await supabase.rpc('admin_grant_plan', { _user_id: id, _plan_id: grantPlanId });
    toast.success('Plano concedido');
    load();
  };

  const removePlan = async () => {
    await supabase.rpc('admin_remove_plan', { _user_id: id });
    toast.success('Plano removido');
    load();
  };

  const forceRenew = async () => {
    await supabase.rpc('admin_force_renew', { _user_id: id });
    toast.success('Renovação forçada');
    load();
  };

  if (loading) return <div className="animate-pulse text-primary">Carregando...</div>;
  if (!data) return <div className="text-muted-foreground">Usuário não encontrado.</div>;

  const p = data.profile || {};
  const auth = data.auth || {};
  const sub = data.subscription;
  const plan = data.plan;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="flex-1">
          <h2 className="font-serif text-2xl md:text-3xl text-gradient-gold">{p.full_name || auth.email || 'Usuário'}</h2>
          <p className="text-xs text-muted-foreground">ID: {p.user_id}</p>
        </div>
        {p.is_suspended && <Badge variant="destructive">Suspenso</Badge>}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Total gasto" value={BRL(data.total_spent_cents)} />
        <Stat label="Diagnósticos" value={data.diagnoses_count} />
        <Stat label="Plano" value={plan?.name || '—'} />
        <Stat label="Status" value={sub?.status || '—'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dados pessoais */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-serif text-lg">Dados pessoais</h3>
          <div><Label>Nome completo</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 61 ..." /></div>
          <div><Label>Nova senha (opcional)</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <Button variant="premium" onClick={saveProfile} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>

        {/* Plano & Assinatura */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-serif text-lg">Plano e assinatura</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Plano atual: <span className="text-foreground">{plan?.name || '—'}</span></div>
            <div>Status: <span className="text-foreground">{sub?.status || '—'}</span></div>
            <div>Próxima cobrança: <span className="text-foreground">{sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—'}</span></div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Conceder plano</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="premium" onClick={grantPlan} disabled={!grantPlanId}>
              <Gift className="h-4 w-4 mr-2" /> Conceder
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={forceRenew}><RotateCcw className="h-4 w-4 mr-2" /> Forçar renovação</Button>
            <Button variant="outline" size="sm" onClick={removePlan}><Ban className="h-4 w-4 mr-2" /> Cancelar plano</Button>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Pagamentos</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(data.payments || []).length === 0 && <p className="text-muted-foreground text-sm">Nenhum pagamento.</p>}
            {(data.payments || []).map((py: any) => (
              <div key={py.id} className="flex items-center justify-between border border-border/40 rounded-lg p-3 text-sm">
                <div>
                  <div className="font-medium">{BRL(py.amount_cents)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(py.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <Badge variant={py.status === 'approved' || py.status === 'paid' ? 'default' : 'outline'}>{py.status}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-serif text-lg mb-4">Diagnósticos ({data.diagnoses_count})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(data.diagnoses || []).length === 0 && <p className="text-muted-foreground text-sm">Nenhum diagnóstico.</p>}
            {(data.diagnoses || []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between border border-border/40 rounded-lg p-3 text-sm">
                <div className="font-mono text-xs">{d.id.slice(0,8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                <Badge variant="outline">{d.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conta */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <h3 className="font-serif text-lg">Informações da conta</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Cadastro:</span> {auth.created_at ? new Date(auth.created_at).toLocaleString('pt-BR') : '—'}</div>
          <div><span className="text-muted-foreground">Último login:</span> {auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString('pt-BR') : '—'}</div>
          <div><span className="text-muted-foreground">Email confirmado:</span> {auth.email_confirmed_at ? 'Sim' : 'Não'}</div>
          <div><span className="text-muted-foreground">Banido até:</span> {auth.banned_until || '—'}</div>
        </div>
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
          <Button variant="outline" onClick={toggleSuspend}>
            {p.is_suspended ? <><ShieldCheck className="h-4 w-4 mr-2" /> Reativar</> : <><ShieldOff className="h-4 w-4 mr-2" /> Suspender</>}
          </Button>
          <Button variant="destructive" onClick={deleteUser}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir permanentemente
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-serif text-xl md:text-2xl mt-1 truncate">{value}</div>
    </div>
  );
}
