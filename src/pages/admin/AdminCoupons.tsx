import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  uses_count: number;
  is_active: boolean;
  applies_to_plan_id: string | null;
}

interface Plan { id: string; name: string }

const empty: Partial<Coupon> = {
  code: '', description: '', discount_type: 'percent', discount_value: 10,
  usage_limit: null, per_user_limit: 1, is_active: true, applies_to_plan_id: null,
  starts_at: null, ends_at: null,
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon>>(empty);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('id,name').eq('is_active', true).order('sort_order'),
    ]);
    if (c.data) setCoupons(c.data as Coupon[]);
    if (p.data) setPlans(p.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.code || !editing.code.trim()) {
      toast.error('Código é obrigatório');
      return;
    }
    const payload = {
      ...editing,
      code: editing.code!.trim().toUpperCase(),
      discount_value: Number(editing.discount_value) || 0,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      per_user_limit: editing.per_user_limit ? Number(editing.per_user_limit) : null,
      applies_to_plan_id: editing.applies_to_plan_id || null,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
    };
    const op = editing.id
      ? supabase.from('coupons').update(payload).eq('id', editing.id)
      : supabase.from('coupons').insert(payload);
    const { error } = await op;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? 'Cupom atualizado' : 'Cupom criado');
    setOpen(false);
    setEditing(empty);
    load();
  };

  const toggle = async (c: Coupon) => {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Excluir cupom "${c.code}"?`)) return;
    await supabase.from('coupons').delete().eq('id', c.id);
    toast.success('Cupom excluído');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-3xl text-gradient-gold">Cupons</h2>
          <p className="text-sm text-muted-foreground mt-1">{coupons.length} cupom(ns) cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button variant="premium" onClick={() => setEditing(empty)}>
              <Plus className="h-4 w-4 mr-2" /> Novo cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing.id ? 'Editar cupom' : 'Novo cupom'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Código</Label>
                <Input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="VIRUM20" />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editing.discount_type} onValueChange={(v) => setEditing({ ...editing, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (centavos)</SelectItem>
                    <SelectItem value="free_shipping">Frete grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input type="number" value={editing.discount_value ?? 0} onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Início</Label>
                <Input type="datetime-local" value={editing.starts_at?.slice(0,16) || ''} onChange={e => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" value={editing.ends_at?.slice(0,16) || ''} onChange={e => setEditing({ ...editing, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <Label>Limite total</Label>
                <Input type="number" value={editing.usage_limit ?? ''} placeholder="ilimitado" onChange={e => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Por usuário</Label>
                <Input type="number" value={editing.per_user_limit ?? ''} placeholder="ilimitado" onChange={e => setEditing({ ...editing, per_user_limit: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="col-span-2">
                <Label>Plano específico</Label>
                <Select value={editing.applies_to_plan_id || 'all'} onValueChange={(v) => setEditing({ ...editing, applies_to_plan_id: v === 'all' ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="premium" onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-4">Código</th>
                <th className="p-4">Desconto</th>
                <th className="p-4">Usos</th>
                <th className="p-4">Validade</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cupom cadastrado.</td></tr>
              ) : coupons.map(c => (
                <tr key={c.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-4 font-mono font-medium">{c.code}</td>
                  <td className="p-4">
                    {c.discount_type === 'percent' && `${c.discount_value}%`}
                    {c.discount_type === 'fixed' && `R$ ${(c.discount_value/100).toFixed(2)}`}
                    {c.discount_type === 'free_shipping' && 'Frete grátis'}
                  </td>
                  <td className="p-4">{c.uses_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {c.ends_at ? new Date(c.ends_at).toLocaleDateString('pt-BR') : 'sem expiração'}
                  </td>
                  <td className="p-4">
                    <Badge variant={c.is_active ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggle(c)}>
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
