import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, User, Calendar, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BookLayout } from '@/components/diagnosis/book/BookLayout';
import type { DiagnosisRecord } from '@/components/diagnosis/book/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AdminDiagnosisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState<DiagnosisRecord | any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('diagnoses').select('*').eq('id', id).single();
      if (error) throw error;
      setDiagnosis(data);

      const { data: pData } = await supabase.from('profiles').select('full_name, email').eq('user_id', data.user_id).maybeSingle();
      setProfile(pData);
    } catch (error) {
      console.error('Error loading diagnosis:', error);
      toast.error('Erro ao carregar detalhes do diagnóstico');
      navigate('/admin/diagnoses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleDownloadPDF = async () => {
    if (!diagnosis || downloading) return;
    setDownloading(true);
    
    try {
      const element = document.querySelector('[data-pdf-source="virum-book"]');
      if (!element) {
        toast.error('O conteúdo do diagnóstico não está carregado corretamente.');
        setDownloading(false);
        return;
      }
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 1.5,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`diagnostico-${profile?.full_name || id?.slice(0,8)}.pdf`);
      toast.success('Download concluído!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="animate-pulse text-primary flex items-center gap-2 h-[50vh] justify-center"><Loader2 className="animate-spin" /> Carregando detalhes...</div>;
  if (!diagnosis) return <div className="text-muted-foreground text-center py-20">Diagnóstico não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/diagnoses')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div>
            <h2 className="font-serif text-2xl text-gradient-gold">Detalhes do Diagnóstico</h2>
            <p className="text-xs text-muted-foreground font-mono">ID: {id}</p>
          </div>
        </div>
        <Button variant="premium" onClick={handleDownloadPDF} disabled={downloading || diagnosis.status !== 'completed'}>
          {downloading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
          Baixar PDF
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="h-4 w-4" />
            <h3 className="font-medium">Usuário</h3>
          </div>
          <div>
            <p className="text-lg font-medium">{profile?.full_name || '—'}</p>
            <p className="text-sm text-muted-foreground">{profile?.email || '—'}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-4 w-4" />
            <h3 className="font-medium">Informações</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Realizado em:</span> {new Date(diagnosis.created_at).toLocaleString('pt-BR')}</p>
            <p className="text-sm"><span className="text-muted-foreground">Status:</span> <Badge className="ml-2" variant="outline">{diagnosis.status}</Badge></p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Tag className="h-4 w-4" />
            <h3 className="font-medium">Tipo</h3>
          </div>
          <p className="text-lg capitalize">{diagnosis.questionnaire?.diagnosis_type || 'Padrão'}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8 bg-white/50">
        <h3 className="font-serif text-xl mb-6 pb-4 border-b border-border/40">Relatório Completo</h3>
        
        {diagnosis.status === 'completed' ? (
          <div className="relative">
            <div data-pdf-source="virum-book" className="max-w-4xl mx-auto shadow-2xl rounded-lg overflow-hidden bg-white">
               <BookLayout diagnosis={diagnosis} />
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            O diagnóstico ainda não foi concluído ou falhou no processamento.
          </div>
        )}
      </div>
    </div>
  );
}
