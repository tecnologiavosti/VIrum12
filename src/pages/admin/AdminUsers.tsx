import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileSpreadsheet, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  diagnoses_count: number;
  total_spent_cents: number;
}

interface Plan { id: string; name: string }

const BRL = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

export default function AdminUsers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', plan_id: '' });

  const load = async () => {
    const [u, p] = await Promise.all([
      supabase.rpc('admin_list_users_full'),
      supabase.from('plans').select('id,name').eq('is_active', true).order('sort_order'),
    ]);
    if (u.data) setRows(u.data as unknown as Row[]);
    if (p.data) setPlans(p.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return rows;
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(t) ||
      (r.email || '').toLowerCase().includes(t) ||
      (r.plan_name || '').toLowerCase().includes(t) ||
      (r.user_id || '').toLowerCase().includes(t),
    );
  }, [rows, q]);

  const createUser = async () => {
    if (!form.email || !form.password) { toast.error('Email e senha são obrigatórios'); return; }
    if (form.password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('admin-user-manage', {
      body: { action: 'create', ...form, plan_id: form.plan_id || undefined },
    });
    setCreating(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || error?.message || 'Erro ao criar usuário');
      return;
    }
    toast.success('Usuário criado com sucesso');
    setOpen(false);
    setForm({ full_name: '', email: '', password: '', phone: '', plan_id: '' });
    load();
  };

  const exportCsv = () => {
    const head = ['ID', 'Nome', 'Email', 'Plano', 'Status', 'Cadastro', 'Último acesso', 'Diagnósticos', 'Total gasto'];
    const lines = filtered.map(r => [
      r.user_id, r.full_name || '', r.email || '', r.plan_name || '-', r.subscription_status || '-',
      r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-',
      r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString('pt-BR') : '-',
      r.diagnoses_count, (r.total_spent_cents / 100).toFixed(2),
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `usuarios-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportXls = () => {
    const head = ['ID','Nome','Email','Plano','Status','Cadastro','Último acesso','Diagnósticos','Total gasto'];
    const rowsHtml = filtered.map(r => `<tr>
      <td>${r.user_id}</td><td>${r.full_name||''}</td><td>${r.email||''}</td>
      <td>${r.plan_name||'-'}</td><td>${r.subscription_status||'-'}</td>
      <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</td>
      <td>${r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString('pt-BR') : '-'}</td>
      <td>${r.diagnoses_count}</td><td>${(r.total_spent_cents/100).toFixed(2)}</td>
    </tr>`).join('');
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    triggerDownload(blob, `usuarios-${new Date().toISOString().slice(0,10)}.xls`);
  };

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="animate-pulse text-primary">Carregando usuários...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-3xl text-gradient-gold">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} usuário(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-3xl flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, email, ID ou plano…" className="pl-9" />
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> CSV</Button>
          <Button variant="outline" onClick={exportXls}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel</Button>
          <Button variant="premium" onClick={() => setOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Adicionar Usuário</Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-4 font-medium text-muted-foreground">Nome</th>
                <th className="p-4 font-medium text-muted-foreground">Email</th>
                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Cadastro</th>
                <th className="p-4 font-medium text-muted-foreground">Último acesso</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Diag.</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.user_id} className="border-t border-border/40 hover:bg-muted/30 cursor-pointer transition" onClick={() => navigate(`/admin/users/${r.user_id}`)}>
                  <td className="p-4">{r.full_name || '—'}</td>
                  <td className="p-4 text-muted-foreground">{r.email || '—'}</td>
                  <td className="p-4">{r.plan_name || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4">
                    {r.subscription_status ? (
                      <Badge variant={r.subscription_status === 'active' ? 'default' : 'outline'}>{r.subscription_status}</Badge>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-4 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="p-4 text-muted-foreground">{r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="p-4 text-right">{r.diagnoses_count}</td>
                  <td className="p-4 text-right font-medium">{BRL(r.total_spent_cents)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Adicionar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome completo</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Senha *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+55 61 ..." /></div>
            <div>
              <Label>Plano inicial</Label>
              <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sem plano (opcional)" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Se selecionado, o plano é ativado imediatamente.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="premium" onClick={createUser} disabled={creating}>
              {creating ? 'Criando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
