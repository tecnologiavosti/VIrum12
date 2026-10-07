import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'normal' | 'warning' | 'critical' | 'emergency';

const META: Record<Status, { emoji: string; label: string; className: string }> = {
  normal: { emoji: '🟢', label: 'Normal', className: 'text-emerald-400' },
  warning: { emoji: '🟡', label: 'Atenção', className: 'text-yellow-400' },
  critical: { emoji: '🔴', label: 'Crítico', className: 'text-red-400' },
  emergency: { emoji: '🚨', label: 'Emergência', className: 'text-red-500' },
};

export function AIUsageCard() {
  const [state, setState] = useState<{ status: Status; usage: number; tokens: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ai_monitoring_status' as any)
        .select('status, usage_percentage, tokens_today')
        .limit(1)
        .maybeSingle();
      const row = data as any;
      if (row) setState({ status: row.status as Status, usage: Number(row.usage_percentage), tokens: Number(row.tokens_today) });
    })();
  }, []);

  const meta = META[state?.status ?? 'normal'];
  const usage = state?.usage ?? 0;

  return (
    <Link
      to="/admin/ai-monitoring"
      className="glass-card rounded-2xl p-6 hover:border-primary/40 transition group block"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">Monitoramento de IA</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
      </div>
      <div className={`font-serif text-2xl ${meta.className}`}>{meta.emoji} {meta.label}</div>
      <div className="text-xs text-muted-foreground mt-2">
        {new Intl.NumberFormat('pt-BR').format(state?.tokens ?? 0)} tokens hoje · {usage.toFixed(1)}% do orçamento
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-3">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, usage)}%` }} />
      </div>
    </Link>
  );
}
