import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiagnosisRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  diagnosis_type: string | null;
}

export default function AdminDiagnoses() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DiagnosisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_diagnoses');
    if (error) {
      console.error('Error loading diagnoses:', error);
    } else {
      setRows(data as unknown as DiagnosisRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = [...rows];
    const t = q.toLowerCase().trim();
    if (t) {
      result = result.filter(r =>
        (r.full_name || '').toLowerCase().includes(t) ||
        (r.email || '').toLowerCase().includes(t) ||
        (r.phone || '').toLowerCase().includes(t) ||
        (r.id || '').toLowerCase().includes(t)
      );
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [rows, q, sortOrder]);

  const exportCsv = () => {
    const head = ['ID', 'Usuário', 'Email', 'Telefone', 'Status', 'Tipo', 'Data'];
    const lines = filtered.map(r => [
      r.id, r.full_name || '', r.email || '', r.phone || '', r.status, r.diagnosis_type || '-',
      new Date(r.created_at).toLocaleString('pt-BR')
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `diagnosticos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="animate-pulse text-primary">Carregando diagnósticos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-3xl text-gradient-gold">Gerenciamento de Diagnósticos</h2>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} diagnóstico(s) encontrado(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-2xl flex-wrap justify-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, email, telefone ou ID..." className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
            {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
          </Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> CSV</Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">ID</th>
                <th className="p-4 font-medium text-muted-foreground">Usuário</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="p-4 font-medium text-muted-foreground">Data</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30 transition">
                  <td className="p-4 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</td>
                  <td className="p-4">
                    <div className="font-medium">{r.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant={r.status === 'completed' ? 'default' : r.status === 'processing' ? 'outline' : 'secondary'}>
                      {r.status === 'completed' ? 'Concluído' : r.status === 'processing' ? 'Processando' : r.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground capitalize">{r.diagnosis_type || '—'}</td>
                  <td className="p-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/diagnoses/${r.id}`)}>
                      Visualizar
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum diagnóstico encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
