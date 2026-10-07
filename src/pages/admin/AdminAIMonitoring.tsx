import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'normal' | 'warning' | 'critical' | 'emergency';

interface StatusRow {
  provider: string;
  model: string;
  tokens_today: number;
  usage_percentage: number;
  status: Status;
  last_checked_at: string;
}

interface ConfigRow {
  id: string;
  daily_token_limit: number;
  warning_percentage: number;
  critical_percentage: number;
  emergency_percentage: number;
}

const STATUS_META: Record<Status, { label: string; emoji: string; className: string }> = {
  normal: { label: 'Normal', emoji: '🟢', className: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/5' },
  warning: { label: 'Atenção', emoji: '🟡', className: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5' },
  critical: { label: 'Crítico', emoji: '🔴', className: 'text-red-400 border-red-400/40 bg-red-400/5' },
  emergency: { label: 'Emergência', emoji: '🚨', className: 'text-red-500 border-red-500/50 bg-red-500/10' },
};

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

export default function AdminAIMonitoring() {
  const [status, setStatus] = useState<StatusRow | null>(null);
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      supabase.from('ai_monitoring_status').select('*').limit(1).maybeSingle(),
      supabase.from('ai_monitoring_config').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ]);
    if (s.data) setStatus(s.data as StatusRow);
    if (c.data) setConfig(c.data as ConfigRow);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runCheck = async () => {
    setChecking(true);
    const { error } = await supabase.functions.invoke('check-ai-usage', { body: {} });
    setChecking(false);
    if (error) {
      toast.error('Falha ao verificar consumo');
      return;
    }
    toast.success('Consumo atualizado');
    load();
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase.from('ai_monitoring_config').update({
      daily_token_limit: config.daily_token_limit,
      warning_percentage: config.warning_percentage,
      critical_percentage: config.critical_percentage,
      emergency_percentage: config.emergency_percentage,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id);
    setSaving(false);
    if (error) { toast.error('Falha ao salvar'); return; }
    toast.success('Configuração salva');
  };

  const st = status?.status ?? 'normal';
  const meta = STATUS_META[st];
  const remainingPct = Math.max(0, 100 - Number(status?.usage_percentage || 0));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl text-gradient-gold">Monitoramento de IA</h2>
          <p className="text-sm text-muted-foreground mt-1">Consumo diário de tokens da IA da VIRUM</p>
        </div>
        <button
          onClick={runCheck}
          disabled={checking || loading}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} /> Verificar agora
        </button>
      </div>

      <div className={`glass-card rounded-2xl p-6 border ${meta.className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-5 w-5" />
          <span className="font-serif text-xl">{meta.emoji} {meta.label}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</div>
            <div className="font-serif text-lg mt-1">{status?.provider ?? 'Grok (Groq)'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelo</div>
            <div className="font-serif text-lg mt-1 truncate">{status?.model ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tokens hoje</div>
            <div className="font-serif text-lg mt-1">{fmt(status?.tokens_today ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uso do orçamento</div>
            <div className="font-serif text-lg mt-1">{Number(status?.usage_percentage ?? 0).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{remainingPct.toFixed(1)}% restante</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Number(status?.usage_percentage || 0))}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Última verificação: {status?.last_checked_at ? new Date(status.last_checked_at).toLocaleString('pt-BR') : '—'}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-serif text-xl mb-4">Configuração</h3>
        {!config ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Limite diário de tokens</span>
              <input
                type="number"
                min={0}
                value={config.daily_token_limit}
                onChange={(e) => setConfig({ ...config, daily_token_limit: Number(e.target.value) })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Atenção (% restante)</span>
              <input
                type="number" min={0} max={100} step="0.1"
                value={config.warning_percentage}
                onChange={(e) => setConfig({ ...config, warning_percentage: Number(e.target.value) })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Crítico (% restante)</span>
              <input
                type="number" min={0} max={100} step="0.1"
                value={config.critical_percentage}
                onChange={(e) => setConfig({ ...config, critical_percentage: Number(e.target.value) })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Emergência (% restante)</span>
              <input
                type="number" min={0} max={100} step="0.1"
                value={config.emergency_percentage}
                onChange={(e) => setConfig({ ...config, emergency_percentage: Number(e.target.value) })}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                <Save className="h-4 w-4" /> Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      <NotificationsFeed />
    </div>
  );
}

function NotificationsFeed() {
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; message: string; read: boolean; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(20);
      setItems((data as any) ?? []);
    })();
  }, []);

  const markRead = async (id: string) => {
    await supabase.from('admin_notifications').update({ read: true }).eq('id', id);
    setItems(items.map(i => i.id === id ? { ...i, read: true } : i));
  };

  if (!items.length) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-serif text-xl mb-4">Notificações recentes</h3>
      <div className="space-y-3">
        {items.map(n => (
          <div key={n.id} className={`p-4 rounded-lg border ${n.read ? 'border-border opacity-60' : 'border-primary/30 bg-primary/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{n.type}</div>
                <div className="font-serif text-base mt-0.5">{n.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString('pt-BR')}</div>
              </div>
              {!n.read && (
                <button onClick={() => markRead(n.id)} className="text-xs text-primary hover:underline shrink-0">
                  Marcar como lida
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
