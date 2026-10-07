import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Download, Share2, ArrowLeft, MessageCircle, User, Palette, Shirt, Scissors, ShoppingBag, LayoutGrid, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { PageTransition } from '@/components/layout/PageTransition';
import { BookLayout } from '@/components/diagnosis/book/BookLayout';
import type { DiagnosisRecord } from '@/components/diagnosis/book/types';
import { visibleChapters } from '@/components/diagnosis/book/chapters';
import { getStaticDiagnosticImage, preloadDiagnosticImageGroupsStrict, setStaticDiagnosticImage } from '@/lib/diagnosticImageLoader';


import { useDiagnosisImages } from '@/hooks/useDiagnosisImages';
import { useLookImages } from '@/hooks/useLookImages';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { Lock } from 'lucide-react';

import { SectionImagesProvider } from '@/contexts/SectionImagesContext';
import {
  normalizeOcasiao, normalizeClima, normalizeTipoCorporal, normalizeCaimento,
  normalizeFormalidade, normalizeTomDePele, normalizeEstilo,
} from '@/lib/imageService';
import type { DiagnosticData } from '@/types/diagnostic';

import { motion } from 'framer-motion';



interface DiagnosisData {
  id: string;
  status: string;
  created_at: string;
  body_analysis: Record<string, unknown> | null;
  color_analysis: Record<string, unknown> | null;
  style_analysis: Record<string, unknown> | null;
  modeling_analysis: Record<string, unknown> | null;
  wardrobe_essentials: Record<string, unknown> | null;
  capsule_wardrobe: Record<string, unknown> | null;
  final_diagnosis: Record<string, unknown> | null;
  generated_images: Record<string, unknown> | null;
  share_token: string | null;
  updated_at?: string | null;
  photo_front_url: string | null;
  photo_side_url: string | null;
  photo_back_url: string | null;
  photo_face_url: string | null;
  questionnaire: Record<string, unknown> | null;
  height_cm: number | null;
  weight_kg: number | null;
  top_size: string | null;
  bottom_size: string | null;
  shoe_size: string | null;
  body_notes: string | null;
  hair_color: string | null;
  eye_color: string | null;
  skin_tone: string | null;
  fit_preference: string | null;
  formality_level: string | null;
  style_intensity_score: Record<string, number> | null;
  body_balance_score: Record<string, number> | null;
}

interface DossierContent {
  identidade_estilo?: string;
  imagem_transmitida?: string;
  imagem_ideal?: string;
  combinacao_estilos?: string;
  construcao_looks?: string;
  pecas_essenciais?: string[];
  modelagens?: string[];
  tecidos?: string[];
  cores?: string;
  estampas?: string;
  calcados?: string[];
  relogios?: string[];
  acessorios?: string[];
  cuidados_imagem?: string[];
  recomendacoes_ocasioes?: { trabalho?: string; eventos?: string; lazer?: string; viagens?: string };
  proximas_compras?: string[];
  orientacoes_evolucao?: string;
}

type SectionId = 'resumo' | 'corpo' | 'cores' | 'estilo' | 'modelagens' | 'essenciais' | 'capsula';

function normalizeImageToken(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function collectDiagnosisPieces(diagnosis: DiagnosisData): string[] {
  const names = new Set<string>();
  const add = (value: unknown) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) names.add(text);
  };
  const essentials = (diagnosis.wardrobe_essentials || {}) as Record<string, unknown>;
  Object.values(essentials).forEach((value) => {
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (typeof item === 'string') add(item);
      else if (item && typeof item === 'object') add((item as Record<string, unknown>).peca || (item as Record<string, unknown>).descricao);
    });
  });
  const capsule = (diagnosis.capsule_wardrobe || {}) as Record<string, unknown>;
  const pieces = (capsule.pecas_capsula || {}) as Record<string, unknown>;
  Object.values(pieces).forEach((value) => Array.isArray(value) && value.forEach(add));
  ['looks_trabalho', 'looks_casual', 'looks_eventos'].forEach((key) => {
    const looks = capsule[key];
    if (!Array.isArray(looks)) return;
    looks.forEach((look) => {
      const lookPieces = (look as Record<string, unknown>)?.pecas;
      if (Array.isArray(lookPieces)) lookPieces.forEach((piece) => String(piece).split(/\s*\+\s*/).forEach(add));
    });
  });
  return Array.from(names);
}

function collectStringList(value: unknown, max = 8): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectStringList(item, max)).filter(Boolean).slice(0, max);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap((item) => collectStringList(item, max)).slice(0, max);
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return text ? [text] : [];
}

function collectLookPieces(diagnosis: DiagnosisData): string[] {
  const capsule = (diagnosis.capsule_wardrobe || {}) as Record<string, unknown>;
  const allLooks = ['looks_trabalho', 'looks_casual', 'looks_eventos']
    .flatMap((key) => Array.isArray(capsule[key]) ? capsule[key] as Array<Record<string, unknown>> : []);
  const firstLook = allLooks.find((look) => Array.isArray(look?.pecas) && look.pecas.length) || allLooks[0];
  const pieces = Array.isArray(firstLook?.pecas) ? firstLook.pecas : [];
  return pieces.flatMap((piece) => String(piece).split(/\s*\+\s*/)).map((piece) => piece.trim()).filter(Boolean).slice(0, 8);
}

function collectAccessories(diagnosis: DiagnosisData): string[] {
  const pieces = collectDiagnosisPieces(diagnosis);
  return pieces.filter((piece) => /cinto|rel[oó]gio|gravata|len[cç]o|bolsa|pasta|[oó]culos|pulseira|anel|carteira|belt|watch|tie|sunglass|briefcase/i.test(piece)).slice(0, 4);
}

function buildImageContext(diagnosis: DiagnosisData) {
  const capsule = (diagnosis.capsule_wardrobe || {}) as Record<string, unknown>;
  const q = (diagnosis.questionnaire || {}) as Record<string, unknown>;
  const allLooks = ['looks_trabalho', 'looks_casual', 'looks_eventos']
    .flatMap((key) => Array.isArray(capsule[key]) ? capsule[key] as Array<Record<string, unknown>> : []);
  const firstLook = allLooks[0];
  return {
    style: String((diagnosis.style_analysis as Record<string, unknown> | null)?.estilo_predominante || (diagnosis.style_analysis as Record<string, unknown> | null)?.estilo || ''),
    season: String((diagnosis.color_analysis as Record<string, unknown> | null)?.estacao || (diagnosis.color_analysis as Record<string, unknown> | null)?.coloracao_pessoal || ''),
    palette: collectStringList((diagnosis.color_analysis as Record<string, unknown> | null)?.paleta_cores_ideais || (diagnosis.color_analysis as Record<string, unknown> | null)?.paleta || (diagnosis.color_analysis as Record<string, unknown> | null)?.cores_recomendadas, 8),
    recommendedPieces: collectDiagnosisPieces(diagnosis).slice(0, 10),
    lookPieces: collectLookPieces(diagnosis),
    combinations: allLooks.map((look) => [look.nome, ...(Array.isArray(look.pecas) ? look.pecas : [])].filter(Boolean).join(': ')).filter(Boolean).slice(0, 3),
    occasion: String(firstLook?.ocasiao || (Array.isArray(q.occasions) ? q.occasions[0] : q.occasion) || ''),
    accessories: collectAccessories(diagnosis),
  };
}

function buildGenerationStyleContext(diagnosis: DiagnosisData) {
  const ctx = buildImageContext(diagnosis);
  return {
    styleIdentity: ctx.style || null,
    colorSeason: ctx.season || null,
    palette: ctx.palette,
    bodyType: (diagnosis.body_analysis as Record<string, unknown> | null)?.tipo_corporal || null,
    formality: diagnosis.formality_level || null,
    personality: ctx.style || null,
    occasion: ctx.occasion || null,
    accessories: ctx.accessories,
  };
}

function hasPieceImage(imagesMap: Map<string, string>, pieceName: string, diagnosisId?: string): boolean {
  const key = normalizeImageToken(pieceName);
  if (!key) return true;
  if (diagnosisId && getStaticDiagnosticImage(`${diagnosisId}:piece:${key}`)) return true;
  if (imagesMap.has(key)) return true;
  return Array.from(imagesMap.keys()).some((storedKey) => storedKey.includes(key) || key.includes(storedKey));
}

function getPieceImage(imagesMap: Map<string, string>, pieceName: string, diagnosisId?: string): string | null {
  const key = normalizeImageToken(pieceName);
  if (!key) return null;
  const staticUrl = diagnosisId ? getStaticDiagnosticImage(`${diagnosisId}:piece:${key}`) : null;
  if (staticUrl) return staticUrl;
  const exact = imagesMap.get(key);
  if (exact) return exact;
  for (const [storedKey, url] of imagesMap.entries()) {
    if (storedKey.includes(key) || key.includes(storedKey)) return url;
  }
  return null;
}

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
}

export default function DiagnosisResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { access: planAccess } = usePlanAccess();
  const canPdf = planAccess?.is_admin || planAccess?.can_download_pdf || false;
  const canShare = planAccess?.is_admin || planAccess?.can_share || false;
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('resumo');
  const [imagesReady, setImagesReady] = useState(false);
  const [imagesProgress, setImagesProgress] = useState({ loaded: 0, total: 0 });
  const [pieceAssetsReady, setPieceAssetsReady] = useState(false);
  const [lookAssetsReady, setLookAssetsReady] = useState(false);
  const [pieceRefresh, setPieceRefresh] = useState(0);
  const generatingPiecesRef = useRef<string>('');
  const imageRefreshKey = `${diagnosis?.updated_at || ''}:${pieceRefresh}`;
  const { imagesMap, isLoading: imagesLoading } = useDiagnosisImages(diagnosis?.id, undefined, imageRefreshKey);
  const { lookImagesMap, isLoading: lookImagesLoading } = useLookImages(diagnosis?.id, imageRefreshKey);
  const requiredPieceNames = useMemo(() => diagnosis ? collectDiagnosisPieces(diagnosis) : [], [diagnosis]);
  const pieceImagesReady = !imagesLoading && requiredPieceNames.every((name) => hasPieceImage(imagesMap, name, diagnosis?.id));
  // Gate: só renderiza o diagnóstico quando imagens principais estiverem prontas
  // (usuário vê tudo já com as fotos, sem placeholders). Timeout de segurança
  // libera após 12s para nunca travar indefinidamente.
  const [imageGateTimedOut, setImageGateTimedOut] = useState(false);
  useEffect(() => {
    setImageGateTimedOut(false);
    if (!diagnosis || diagnosis.status !== 'completed') return;
    const t = window.setTimeout(() => setImageGateTimedOut(true), 12000);
    return () => window.clearTimeout(t);
  }, [diagnosis?.id, diagnosis?.status]);
  const contentImagesReady =
    !diagnosis || diagnosis.status !== 'completed'
      ? true
      : imageGateTimedOut ||
        (!imagesLoading && !lookImagesLoading && pieceImagesReady && lookAssetsReady);
  void imagesReady; void pieceAssetsReady;


  useEffect(() => {
    // NÃO limpar mais o cache aqui — reutilizar URLs garante carregamento rápido
    // (Pollinations cacheia por URL no CDN). A variação é estável por diagnóstico.
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (id && user) fetchDiagnosis();
  }, [id, user, authLoading]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status === 'failed') return;
    const images = diagnosis.generated_images;
    const hasPersonalizedImages = images && Object.keys(images).length >= 7;
    if (diagnosis.status === 'completed' && hasPersonalizedImages) return;

    const timer = window.setTimeout(() => {
      fetchDiagnosis();
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [diagnosis?.id, diagnosis?.status, diagnosis?.generated_images]);

  useEffect(() => {
    setImagesReady(false);
    setPieceAssetsReady(false);
    setLookAssetsReady(false);
    setImagesProgress({ loaded: 0, total: 0 });
    generatingPiecesRef.current = '';
  }, [diagnosis?.id]);

  // Section-image warmup intentionally does NOT generate direct browser
  // Pollinations URLs anymore. Those URLs were bypassing the controlled Edge
  // Function path and could keep unsafe old images in localStorage.
  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed' || !user?.id) return;
    try {
      console.log('[VIRUM IMG AUDIT] STEP 6 - Warmup direto de seções desativado; aguardando geração controlada por SmartSectionImage', {
        diagnosisId: diagnosis.id,
        hasGeneratedImages: Boolean(diagnosis.generated_images && Object.keys(diagnosis.generated_images).length),
      });
      setImagesProgress({ loaded: 0, total: 0 });
      setImagesReady(true);


    } catch (err) {
      // silencioso — se falhar aqui, os outros bloqueios ainda seguram a tela de processamento
      console.warn('[warmup] failed', err);
    }
  }, [diagnosis?.id, diagnosis?.status, diagnosis?.generated_images, user?.id]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed') return;
    if (lookImagesLoading) {
      setLookAssetsReady(false);
      return;
    }
    setLookAssetsReady(false);
    let cancelled = false;
    const entries = Object.entries(lookImagesMap).filter(([, url]) => Boolean(url));
    preloadDiagnosticImageGroupsStrict(entries.map(([name, url]) => ({
      key: `${diagnosis.id}:look:${normalizeImageToken(name)}`,
      urls: [url],
    })), undefined).then(() => {
      if (!cancelled) setLookAssetsReady(true);
    });
    return () => { cancelled = true; };
  }, [diagnosis?.id, diagnosis?.status, lookImagesLoading, lookImagesMap]);

  useEffect(() => {
    if (!diagnosis || diagnosis.status !== 'completed' || !imagesReady || imagesLoading) return;
    const missing = requiredPieceNames.filter((name) => !hasPieceImage(imagesMap, name, diagnosis.id));
    const readyUrls = requiredPieceNames
      .map((name) => ({ name, url: getPieceImage(imagesMap, name, diagnosis.id) }))
      .filter((item): item is { name: string; url: string } => Boolean(item.url));
    setPieceAssetsReady(false);
    if (missing.length === 0) {
      let cancelled = false;
      preloadDiagnosticImageGroupsStrict(readyUrls.map(({ name, url }) => ({
        key: `${diagnosis.id}:piece:${normalizeImageToken(name)}`,
        urls: [url],
      })), undefined).then(() => {
        if (!cancelled) setPieceAssetsReady(true);
      });
      return () => { cancelled = true; };
    }
    const batchKey = `${diagnosis.id}:${missing.map(normalizeImageToken).join('|')}`;
    if (generatingPiecesRef.current === batchKey) return;
    generatingPiecesRef.current = batchKey;
    let cancelled = false;
    (async () => {
      const generatedUrls: { name: string; url: string }[] = [];
      await Promise.all(missing.map(async (piece) => {
        try {
          const { data } = await supabase.functions.invoke('search-clothing-image', {
            body: {
              query: piece,
              count: 1,
              diagnosisId: diagnosis.id,
              mode: 'product',
            },
          });
          if (cancelled) return;
          const imageUrl = (data as { results?: Array<{ url?: string }> } | null)?.results?.[0]?.url;
          if (imageUrl) {
            setStaticDiagnosticImage(`${diagnosis.id}:piece:${normalizeImageToken(piece)}`, imageUrl);
            generatedUrls.push({ name: piece, url: imageUrl });
          }
        } catch (error) {
          console.warn('piece image warmup failed', piece, error);
        }
      }));
      await preloadDiagnosticImageGroupsStrict(generatedUrls.map(({ name, url }) => ({
        key: `${diagnosis.id}:piece:${normalizeImageToken(name)}`,
        urls: [url],
      })), undefined);
      if (!cancelled) {
        setPieceRefresh((value) => value + 1);
        const allStatic = requiredPieceNames.every((name) => getPieceImage(imagesMap, name, diagnosis.id) || generatedUrls.some((item) => normalizeImageToken(item.name) === normalizeImageToken(name)));
        if (!allStatic) generatingPiecesRef.current = '';
        setPieceAssetsReady(allStatic);
      }
    })();
    return () => { cancelled = true; };
  }, [diagnosis?.id, diagnosis?.status, imagesReady, imagesLoading, requiredPieceNames, imagesMap]);


  const fetchDiagnosis = async () => {
    try {
      const { data, error } = await supabase.from('diagnoses').select('*').eq('id', id).single();
      if (error) throw error;
      setDiagnosis(data as unknown as DiagnosisData);
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      toast.error('Erro ao carregar diagnóstico');
      navigate('/account');
    } finally {
      setLoading(false);
    }
  };

  const generateShareToken = async (): Promise<string | null> => {
    if (!diagnosis) return null;
    if (diagnosis.share_token) return diagnosis.share_token;
    setSharing(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase.from('diagnoses').update({ share_token: token } as any).eq('id', diagnosis.id);
      if (error) throw error;
      setDiagnosis({ ...diagnosis, share_token: token });
      return token;
    } catch (err) {
      console.error('Error generating share token:', err);
      toast.error('Erro ao gerar link de compartilhamento');
      return null;
    } finally {
      setSharing(false);
    }
  };

  if (loading || authLoading || !contentImagesReady) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs font-sans text-muted-foreground uppercase tracking-widest animate-pulse">
              {loading || authLoading ? 'Carregando diagnóstico' : 'Preparando imagens do seu diagnóstico'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!diagnosis) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <p className="text-muted-foreground font-sans">Diagnóstico não encontrado</p>
          <Button variant="premium" onClick={() => navigate('/account')}>Voltar</Button>
        </div>
      </Layout>
    );
  }

  if (diagnosis.status !== 'completed') {
    const failed = diagnosis.status === 'failed';
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-5 text-center max-w-md w-full">
            {failed ? (
              <div className="w-16 h-16 rounded-full border border-destructive/30 bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive font-serif text-2xl">!</span>
              </div>
            ) : (
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            <div className="space-y-2">
              <h1 className="font-serif text-2xl text-foreground">
                {failed ? 'Diagnóstico não concluído' : 'Preparando seu diagnóstico'}
              </h1>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                {failed
                  ? 'Não foi possível finalizar este diagnóstico. Volte e tente gerar novamente.'
                  : 'Seu diagnóstico está sendo finalizado. As imagens serão carregadas individualmente assim que o resultado abrir.'}
              </p>
            </div>
            {failed && (
              <Button variant="premium" onClick={() => navigate('/account')}>
                Voltar
              </Button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const getShareUrl = (token: string) => `${window.location.origin}/diagnosis/share/${token}`;

  const handleShare = async () => {
    const token = await generateShareToken();
    if (!token) return;
    const url = getShareUrl(token);
    if (navigator.share) { try { await navigator.share({ title: 'Meu Diagnóstico VIRUM', url }); } catch { return; } }
    else { await navigator.clipboard.writeText(url); toast.success('Link copiado!'); }
  };

  const handleShareWhatsApp = async () => {
    const token = await generateShareToken();
    if (!token) return;
    const url = getShareUrl(token);
    const text = encodeURIComponent(`✨ Confira meu diagnóstico de estilo pessoal na VIRUM!\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    const toastId = 'virum-pdf';
    toast.loading('Gerando dossiê VIRUM...', { id: toastId });
    try {
      const { default: html2canvas } = await import('html2canvas-pro');

      // ── FONTE ÚNICA DE VERDADE ──────────────────────────────────────────
      // Reaproveita APENAS o template visual antigo (capa, tipografia, paleta,
      // acabamento premium). TODO o conteúdo vem do diagnóstico ATUAL — os
      // capítulos de `visibleChapters(diagnosis)` e as fotos enviadas pelo
      // usuário. Nenhuma chamada de IA, nenhum texto/dado antigo.

      const sanitize = (input: unknown): string => {
        if (input === null || input === undefined) return '';
        let s = String(input);
        s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
        s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
        s = s.replace(/[*_`~#>]+/g, '');
        s = s.normalize('NFC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');
        s = s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
        return s;
      };
      const escapeHtml = (raw: string) => raw
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const safe = (v: unknown) => escapeHtml(sanitize(v));

      // ── Color helper (usado só para render de paleta do diagnóstico atual)
      const COLOR_HEX: Record<string, string> = {
        'azul royal': '#4169E1', 'azul marinho': '#000080', 'azul': '#2563EB', 'azul claro': '#87CEEB',
        'azul petroleo': '#006D6F', 'azul noite': '#191970', 'azul gelo': '#D6F0FF', 'azul turquesa': '#40E0D0',
        'vermelho': '#DC2626', 'vermelho escuro': '#8B0000', 'borgonha': '#800020', 'vinho': '#722F37', 'bordo': '#800020',
        'preto': '#0A0A0A', 'branco': '#FAFAFA', 'off-white': '#FAF9F6',
        'creme': '#FFFDD0', 'bege': '#F5F5DC', 'areia': '#C2B280', 'nude': '#E3BC9A', 'taupe': '#B8A99A',
        'rosa': '#FF69B4', 'rosa cha': '#F4C2C2', 'rosa velho': '#C97D7D', 'rosa antigo': '#BC8F8F',
        'roxo': '#800080', 'lilas': '#C8A2C8', 'violeta': '#8B00FF',
        'verde': '#22C55E', 'verde escuro': '#006400', 'verde salvia': '#8FA688', 'verde oliva': '#808000', 'verde militar': '#4B5320', 'verde musgo': '#8A9A5B', 'verde menta': '#98FF98',
        'amarelo': '#FACC15', 'mostarda': '#FFDB58', 'dourado': '#D4AF37',
        'laranja': '#FF8C00', 'coral': '#FF7F50', 'salmao': '#FA8072', 'terracota': '#E2725B', 'ferrugem': '#B7410E',
        'marrom': '#8B4513', 'marrom escuro': '#3E2723', 'chocolate': '#D2691E', 'caramelo': '#FFD59A', 'cafe': '#6F4E37',
        'cinza': '#808080', 'cinza escuro': '#404040', 'cinza claro': '#C0C0C0', 'cinza chumbo': '#36454F',
        'prata': '#C0C0C0', 'turquesa': '#40E0D0', 'petroleo': '#006D6F',
        'lavanda': '#E6E6FA', 'marinho': '#000080',
      };
      const colorNameToHex = (name: string): string => {
        const key = String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (!key) return '#CCCCCC';
        if (COLOR_HEX[key]) return COLOR_HEX[key];
        const hit = Object.keys(COLOR_HEX).find(k => key.includes(k));
        if (hit) return COLOR_HEX[hit];
        let h = 0;
        for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
        return `hsl(${Math.abs(h) % 360}, 42%, 55%)`;
      };

      // ── Fotos enviadas pelo usuário (única fonte de imagens do PDF)
      const clientPhotos: Array<[string, string]> = []; // Removidas visualmente do início do diagnóstico

      // ── Pré-carrega TODAS as imagens como data URLs para contornar CORS
      // do html2canvas (Supabase Storage/CDN externo). Sem isso o canvas fica
      // "tainted" e as imagens caem do render final do PDF.
      const dataUrlMap = new Map<string, string>();
      const toDataUrl = async (url: string): Promise<string | null> => {
        try {
          const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      // Preload das fotos do formulário desativado para a Apresentação, 
      // mas mantido internamente se necessário por outros blocos.
      const resolveUrl = (u: string) => dataUrlMap.get(u) || u;

      // ── Resumo executivo — extraído exclusivamente do diagnóstico atual
      const finalData = (diagnosis.final_diagnosis || {}) as Record<string, unknown>;
      const summaryText = sanitize(
        finalData.summary
        || finalData.resumo
        || finalData.transformacao_proposta
        || finalData.perfil_cliente
        || ''
      );

      const dateStr = new Date(diagnosis.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const clientName = user?.user_metadata?.full_name || user?.email || 'Cliente Virum';

      // ── Renderizadores dos capítulos "block" a partir do diagnóstico atual
      const colorData = (diagnosis.color_analysis || {}) as Record<string, unknown>;
      const bodyData = (diagnosis.body_analysis || {}) as Record<string, unknown>;
      const modelingData = (diagnosis.modeling_analysis || {}) as Record<string, unknown>;
      const wardrobeData = (diagnosis.wardrobe_essentials || {}) as Record<string, unknown>;
      const capsuleData = (diagnosis.capsule_wardrobe || {}) as Record<string, unknown>;

      const collectColors = (): string[] => {
        const paleta = (colorData.paleta_cores_ideais || {}) as Record<string, unknown>;
        const raw = [
          ...((paleta.neutros as string[]) || []),
          ...((paleta.cores_base as string[]) || []),
          ...((paleta.cores_destaque as string[]) || []),
          ...((paleta.cores_acessorios as string[]) || []),
          ...((colorData.cores_ideais as string[]) || []),
          ...((colorData.cores_recomendadas as string[]) || []),
        ].filter(Boolean).map(String);
        return Array.from(new Set(raw));
      };

      const renderPaletteBlock = () => {
        const cores = collectColors();
        if (!cores.length) return '';
        return `<div class="vr-swatches">${cores.map(c => `<div class="vr-swatch"><span class="vr-swatch-dot" style="background:${colorNameToHex(c)}"></span><span class="vr-swatch-name">${safe(c)}</span></div>`).join('')}</div>`;
      };

      const renderBodyBlock = () => {
        const items: Array<[string, string]> = [];
        if (diagnosis.height_cm) items.push(['Altura', `${diagnosis.height_cm} cm`]);
        if (diagnosis.weight_kg) items.push(['Peso', `${diagnosis.weight_kg} kg`]);
        const bt = bodyData.tipo_corporal as string | undefined;
        if (bt) items.push(['Biotipo', String(bt)]);
        if (diagnosis.top_size) items.push(['Tam. Superior', String(diagnosis.top_size)]);
        if (diagnosis.bottom_size) items.push(['Tam. Inferior', String(diagnosis.bottom_size)]);
        if (diagnosis.shoe_size) items.push(['Calçado', String(diagnosis.shoe_size)]);
        const desc = sanitize(bodyData.descricao_tipo || bodyData.descricao || '');
        const recs = Array.isArray(bodyData.recomendacoes_modelagem) ? (bodyData.recomendacoes_modelagem as unknown[]).map(String) : [];
        return `
          ${items.length ? `<div class="vr-grid-3">${items.map(([k, v]) => `<div class="vr-stat"><strong>${safe(k)}:</strong> ${safe(v)}</div>`).join('')}</div>` : ''}
          ${desc ? `<p class="vr-line" style="margin-top:14px;">${safe(desc)}</p>` : ''}
          ${recs.length ? `<ul class="vr-tips">${recs.map(t => `<li>${safe(t)}</li>`).join('')}</ul>` : ''}
        `;
      };

      const renderWardrobeBlock = () => {
        const list = Array.isArray(wardrobeData.pecas_essenciais) ? wardrobeData.pecas_essenciais as unknown[] : [];
        if (!list.length) return '';
        return `<ul class="vr-tips">${list.map(item => {
          const o = (item && typeof item === 'object') ? item as Record<string, unknown> : {};
          const nome = sanitize(o.peca || o.nome || item);
          const detalhe = sanitize(o.descricao || o.prioridade || '');
          return `<li><strong>${safe(nome)}</strong>${detalhe ? ` — ${safe(detalhe)}` : ''}</li>`;
        }).join('')}</ul>`;
      };

      const renderCapsuleBlock = () => {
        const pieces = (capsuleData.pecas_capsula || {}) as Record<string, unknown>;
        const cards: Array<{ name: string; cor: string; imageUrl: string | null }> = [];
        Object.entries(pieces).forEach(([catKey, items]) => {
          if (catKey === 'quantidade_total' || !Array.isArray(items)) return;
          (items as unknown[]).forEach(raw => {
            if (typeof raw !== 'string') return;
            const text = sanitize(raw);
            if (!text) return;
            let name = text, cor = '';
            const m1 = text.match(/^(.*?)\s*\((.+?)\)\s*$/);
            const m2 = text.match(/^(.*?)\s+-\s+(.+)$/);
            if (m1) { name = m1[1].trim(); cor = m1[2].trim(); }
            else if (m2) { name = m2[1].trim(); cor = m2[2].trim(); }
            cards.push({ name, cor, imageUrl: getPieceImage(imagesMap, name, diagnosis.id) });
          });
        });
        if (!cards.length) return '';
        return `<div class="vr-cards">${cards.map(c => `
          <div class="vr-card-item">
            <div class="vr-card-img">${c.imageUrl ? `<img src="${escapeHtml(resolveUrl(c.imageUrl))}" crossorigin="anonymous" alt="${safe(c.name)}" />` : `<div class="vr-card-ph"></div>`}</div>
            <div class="vr-card-body">
              <div class="vr-card-name">${safe(c.name)}</div>
              ${c.cor ? `<div class="vr-card-meta"><strong>Cor:</strong> ${safe(c.cor)}</div>` : ''}
            </div>
          </div>`).join('')}</div>`;
      };

      const renderTimelineBlock = () => {
        const items: Array<[string, unknown]> = [];
        const push = (label: string, val: unknown) => { if (val) items.push([label, val]); };
        push('30 dias', finalData.plano_30_dias || finalData.trinta_dias);
        push('60 dias', finalData.plano_60_dias || finalData.sessenta_dias);
        push('90 dias', finalData.plano_90_dias || finalData.noventa_dias);
        const generic = finalData.plano_evolucao || finalData.cronograma;
        if (!items.length && generic) {
          return `<p class="vr-line">${safe(generic)}</p>`;
        }
        if (!items.length) return '';
        return `<ul class="vr-tips">${items.map(([k, v]) => {
          const val = Array.isArray(v) ? (v as unknown[]).map(String).join('; ') : String(v);
          return `<li><strong>${safe(k)}:</strong> ${safe(val)}</li>`;
        }).join('')}</ul>`;
      };

      const renderRefsBlock = () => {
        // As fotos do usuário aparecem APENAS na página de apresentação.
        // Referências visuais dos capítulos vêm do clone da tela abaixo,
        // que preserva as MESMAS imagens exibidas no diagnóstico.
        return '';
      };

      const renderQuoteBlock = () => {
        const msg = sanitize(finalData.mensagem_final || finalData.frase_objetivo || '');
        if (!msg) return '';
        return `<blockquote class="vr-quote">${safe(msg)}</blockquote>`;
      };

      const renderBlock = (kind: string): string => {
        switch (kind) {
          case 'palette': return renderPaletteBlock();
          case 'body': return renderBodyBlock();
          case 'wardrobe': return renderWardrobeBlock();
          case 'capsule': return renderCapsuleBlock();
          case 'timeline': return renderTimelineBlock();
          case 'refs': return renderRefsBlock();
          case 'quote': return renderQuoteBlock();
          default: return '';
        }
      };

      // ── Capítulos: clonados diretamente do que está renderizado na tela
      // (`[data-pdf-source="virum-book"]`). Isso garante que TODAS as imagens
      // do diagnóstico (looks, cápsula, peças, hero images das seções) sejam
      // exatamente as mesmas que o usuário vê — sem reutilizar fotos do
      // formulário e sem regenerar nada. O clone é inserido no `#vr-pdf-chapters-slot`
      // logo após o host offscreen ser montado (ver mais abaixo).
      const chapterPages = `<div id="vr-pdf-chapters-slot"></div>`;
      void renderBlock; // renderers legados mantidos apenas como fallback futuro
      void visibleChapters;

      // ── Capa premium (única coisa reaproveitada do template antigo)
      const pageCover = `
        <div class="vr-cover">
          <img src="/virum-logo.svg" alt="VIRUM" class="vr-cover-logo" crossorigin="anonymous" />
          <div class="vr-cover-brand">V I R U M</div>
          <div class="vr-cover-tagline">Dossiê de Estilo Masculino</div>
          <div class="vr-cover-rule"></div>
          <div class="vr-cover-client">${safe(clientName)}</div>
          <div class="vr-cover-date">Emitido em ${safe(dateStr)}</div>
          <p class="vr-cover-intro">Seu diagnóstico completo de imagem — análises, recomendações e o guarda-roupa curado para você.</p>
        </div>`;

      // ── Página de apresentação (nome, data, resumo executivo, fotos)
      const pagePresentation = `
        <section class="pdf-chapter pdf-presentation">
          <div class="vr-chapter-eyebrow">Apresentação</div>
          <h2 class="vr-h2">${safe(clientName)}</h2>
          <p class="vr-chapter-kicker">Diagnóstico emitido em ${safe(dateStr)}</p>
          ${summaryText ? `<div class="vr-highlight"><div class="vr-highlight-item"><span class="vr-highlight-k">Resumo Executivo</span><span class="vr-highlight-v">${safe(summaryText)}</span></div></div>` : ''}
          <div class="vr-photos" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:16px;margin-top:24px;">
            ${[
              ['Frente', diagnosis.photo_front_url],
              ['Lateral', diagnosis.photo_side_url],
              ['Costas', diagnosis.photo_back_url],
              ['Rosto', diagnosis.photo_face_url],
            ].filter(([, url]) => !!url).map(([label, url]) => `
              <figure class="vr-photo" style="margin:0;">
                <div class="vr-photo-img" style="aspect-ratio:3/4;overflow:hidden;background:#f5f5f5;border:1px solid #eee;">
                  <img src="${escapeHtml(resolveUrl(url!))}" alt="${safe(label)}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />
                </div>
                <figcaption style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;color:#888;">${safe(label)}</figcaption>
              </figure>
            `).join('')}
          </div>
        </section>`;

      // ── HTML (A4 width @ 794px = 210mm @ 96dpi)
      const A4_W = 794;
      const html = `
        <div id="vr-pdf-root" style="width:${A4_W}px;background:#ffffff;">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,600&family=Montserrat:wght@400;500;700&display=swap');
            #vr-pdf-root, #vr-pdf-root * { box-sizing:border-box; }
            #vr-pdf-root { font-family: 'Montserrat', Helvetica, Arial, sans-serif; color:#1a1a1a; background:#ffffff; width:${A4_W}px; padding:0; font-size:16px; line-height:1.8; }
            #vr-pdf-root .pdf-chapter { padding:72px 64px 72px; min-height:1123px; page-break-before:always; break-before:page; page-break-inside:auto; }
            #vr-pdf-root .pdf-chapter:first-of-type { page-break-before:auto; }
            #vr-pdf-root .vr-chapter-eyebrow { font-family:'Montserrat', sans-serif; font-size:11px; font-weight:700; letter-spacing:0.32em; text-transform:uppercase; color:#8a7a3c; margin-bottom:14px; }
            #vr-pdf-root h2.vr-h2 { font-family:'Playfair Display', Georgia, serif; font-size:36px; font-weight:700; color:#0A0A0A; letter-spacing:0.01em; margin:0 0 12px; padding-bottom:16px; border-bottom:2px solid #C6A74E; }
            #vr-pdf-root .vr-chapter-kicker { font-family:'Playfair Display', Georgia, serif; font-style:italic; font-size:17px; line-height:1.6; color:#555; margin:6px 0 28px; }
            #vr-pdf-root .vr-chapter-body { margin-top:8px; }
            #vr-pdf-root h3.vr-h3 { font-family:'Playfair Display', Georgia, serif; font-size:19px; font-weight:700; color:#0A0A0A; letter-spacing:0.01em; margin:28px 0 12px; padding-left:12px; border-left:3px solid #C6A74E; }
            #vr-pdf-root p.vr-line { margin:0 0 14px; font-size:16px; line-height:1.8; color:#2a2a2a; text-align:left; hyphens:none; -webkit-hyphens:none; word-break:normal; overflow-wrap:normal; }
            #vr-pdf-root p.vr-line strong, #vr-pdf-root .vr-stat strong { color:#0A0A0A; font-weight:700; }
            #vr-pdf-root .vr-grid-3 { display:flex; flex-wrap:wrap; gap:8px 24px; }
            #vr-pdf-root .vr-stat { font-size:15px; color:#2a2a2a; padding:6px 0; min-width:200px; }
            #vr-pdf-root ul.vr-tips { margin:8px 0 16px; padding-left:0; list-style:none; }
            #vr-pdf-root ul.vr-tips li { position:relative; margin-bottom:12px; line-height:1.75; color:#2a2a2a; font-size:15.5px; padding-left:20px; text-align:left; hyphens:none; -webkit-hyphens:none; word-break:normal; overflow-wrap:normal; }
            #vr-pdf-root ul.vr-tips li::before { content:''; position:absolute; left:0; top:14px; width:12px; height:2px; background:#C6A74E; }
            #vr-pdf-root .vr-highlight { display:flex; flex-wrap:wrap; gap:0; background:#faf7f0; border-left:3px solid #C6A74E; padding:22px 26px; margin:0 0 28px; }
            #vr-pdf-root .vr-highlight-item { flex:1 1 240px; padding:6px 14px 6px 0; display:flex; flex-direction:column; gap:6px; }
            #vr-pdf-root .vr-highlight-k { font-family:'Montserrat', sans-serif; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.22em; color:#8a7a3c; }
            #vr-pdf-root .vr-highlight-v { font-family:'Playfair Display', Georgia, serif; font-size:17px; color:#0A0A0A; font-weight:400; line-height:1.6; }
            #vr-pdf-root .vr-swatches { display:flex; flex-wrap:wrap; gap:10px 14px; margin:6px 0 18px; }
            #vr-pdf-root .vr-swatch { display:flex; align-items:center; gap:10px; padding:6px 14px 6px 6px; border:1px solid #e5e5e5; border-radius:24px; background:#fff; font-size:13.5px; color:#0A0A0A; }
            #vr-pdf-root .vr-swatch-dot { display:inline-block; width:22px; height:22px; border-radius:50%; border:1px solid rgba(0,0,0,0.12); }
            #vr-pdf-root .vr-swatch-name { font-family:'Montserrat', sans-serif; letter-spacing:0.02em; font-weight:500; }
            #vr-pdf-root .vr-quote { margin:18px 0 6px; padding:20px 26px 20px 52px; background:#faf7f0; border-left:3px solid #C6A74E; font-family:'Playfair Display', Georgia, serif; font-style:italic; color:#0A0A0A; font-size:17px; line-height:1.7; position:relative; }
            #vr-pdf-root .vr-quote::before { content:'\\201C'; position:absolute; left:18px; top:-4px; font-family:'Playfair Display', Georgia, serif; font-size:56px; color:#C6A74E; line-height:1; }
            #vr-pdf-root .vr-cards { display:flex; flex-wrap:wrap; gap:14px; }
            #vr-pdf-root .vr-card-item { width:calc(33.333% - 10px); border:1px solid #eaeaea; overflow:hidden; background:#fff; page-break-inside: avoid; break-inside: avoid; }
            #vr-pdf-root .vr-card-img { width:100%; aspect-ratio: 1 / 1; background:#f5f5f5; display:flex; align-items:center; justify-content:center; overflow:hidden; }
            #vr-pdf-root .vr-card-img img { width:100%; height:100%; object-fit:cover; display:block; }
            #vr-pdf-root .vr-card-ph { width:100%; height:100%; background:#f5f5f5; }
            #vr-pdf-root .vr-card-body { padding:10px 12px; }
            #vr-pdf-root .vr-card-name { font-family:'Playfair Display', Georgia, serif; font-size:15px; font-weight:700; color:#0A0A0A; margin-bottom:6px; line-height:1.35; }
            #vr-pdf-root .vr-card-meta { font-size:12.5px; color:#555; line-height:1.5; margin-top:2px; }
            #vr-pdf-root .vr-cover { width:${A4_W}px; height:1123px; background:#fdfaf1; color:#0A0A0A; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:96px 80px; page-break-after:always; break-after:page; }
            #vr-pdf-root .vr-cover-logo { width:120px; height:auto; display:block; margin:0 auto 32px; }
            #vr-pdf-root .vr-cover-brand { font-family:'Playfair Display', Georgia, serif; font-size:40px; font-weight:700; letter-spacing:0.42em; color:#0A0A0A; }
            #vr-pdf-root .vr-cover-tagline { font-family:'Montserrat', sans-serif; font-size:12px; letter-spacing:0.36em; text-transform:uppercase; color:#8a7a3c; margin:16px 0 0; }
            #vr-pdf-root .vr-cover-rule { width:80px; height:2px; background:#C6A74E; margin:36px auto; }
            #vr-pdf-root .vr-cover-client { font-family:'Playfair Display', Georgia, serif; font-size:22px; font-weight:700; color:#0A0A0A; }
            #vr-pdf-root .vr-cover-date { font-family:'Montserrat', sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:#8a7a3c; margin-top:10px; }
            #vr-pdf-root .vr-cover-intro { font-family:'Playfair Display', Georgia, serif; font-style:italic; font-size:17px; line-height:1.7; color:#3a3a3a; max-width:480px; margin:44px auto 0; }
            #vr-pdf-root .vr-photos { display:flex; flex-wrap:wrap; gap:14px; }
            #vr-pdf-root .vr-photo { width:calc(25% - 11px); margin:0; page-break-inside:avoid; break-inside:avoid; }
            #vr-pdf-root .vr-photo-img { width:100%; aspect-ratio: 3 / 4; background:#f5f5f5; overflow:hidden; border:1px solid #eaeaea; }
            #vr-pdf-root .vr-photo-img img { width:100%; height:100%; object-fit:cover; display:block; }
            #vr-pdf-root .vr-photo figcaption { font-family:'Montserrat', sans-serif; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#666; text-align:center; margin-top:8px; }
          </style>
          ${pageCover}
          ${pagePresentation}
          ${chapterPages}
        </div>`;

      // Off-screen host
      const host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = `position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;z-index:-1;`;
      const inner = document.createElement('div');
      inner.style.cssText = `position:absolute;left:0;top:0;width:${A4_W}px;background:#ffffff;`;
      inner.innerHTML = html;
      host.appendChild(inner);
      document.body.appendChild(host);
      const root = inner.firstElementChild as HTMLElement;

      // ── Clona a MESMA árvore renderizada na tela do diagnóstico
      // (`[data-pdf-source="virum-book"]`) para dentro do slot de capítulos.
      // Isso preserva 100% das imagens que o usuário está vendo (looks,
      // guarda-roupa cápsula, peças, hero images de seção) — sem regenerar,
      // sem substituir e sem reutilizar as fotos do formulário.
      const slot = root.querySelector('#vr-pdf-chapters-slot') as HTMLElement | null;
      const liveArticle = document.querySelector<HTMLElement>('[data-pdf-source="virum-book"]');
      if (slot && liveArticle) {
        const cloned = liveArticle.cloneNode(true) as HTMLElement;
        // Remove a capa da tela (já temos a capa premium no PDF)
        cloned.querySelectorAll('[data-chapter-id="capa"]').forEach((n) => n.remove());
        // Ajustes de largura para caber na página A4 do PDF
        cloned.classList.remove('max-w-2xl');
        cloned.style.maxWidth = 'none';
        cloned.style.width = '100%';
        cloned.style.background = '#ffffff';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `padding:56px 64px;background:#ffffff;page-break-before:always;break-before:page;`;
        wrapper.appendChild(cloned);
        slot.replaceWith(wrapper);
      }

      // Converte TODAS as <img> do root para data URL (contorna CORS do
      // html2canvas para imagens do Supabase Storage / CDNs externos).
      const allImgs = Array.from(root.querySelectorAll('img'));
      await Promise.all(allImgs.map(async (img) => {
        img.removeAttribute('loading');
        img.setAttribute('crossorigin', 'anonymous');
        const src = img.currentSrc || img.src || img.getAttribute('src') || '';
        if (!src || src.startsWith('data:')) return;
        if (dataUrlMap.has(src)) { img.src = dataUrlMap.get(src)!; return; }
        const d = await toDataUrl(src);
        if (d) { dataUrlMap.set(src, d); img.src = d; }
      }));

      // Aguarda todas as imagens (data URLs) estarem carregadas no DOM.
      const imgs = Array.from(root.querySelectorAll('img'));
      await Promise.all(imgs.map(img => new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(() => resolve(), 8000);
      })));
      try {
        if (typeof document !== 'undefined' && (document as Document).fonts) {
          await Promise.race([
            (document as Document).fonts.ready,
            new Promise((r) => setTimeout(r, 5000)),
          ]);
          await Promise.all([
            (document as Document).fonts.load("700 24px 'Playfair Display'"),
            (document as Document).fonts.load("italic 600 15px 'Playfair Display'"),
            (document as Document).fonts.load("500 13.5px 'Montserrat'"),
            (document as Document).fonts.load("700 11.5px 'Montserrat'"),
          ]).catch(() => {});
        }
      } catch { /* noop */ }
      await new Promise(r => setTimeout(r, 150));

      const rootRect = root.getBoundingClientRect();
      const atomicEls = Array.from(root.querySelectorAll<HTMLElement>('.vr-card-item, .vr-cover, .vr-photo'));
      const atomicBounds = atomicEls.map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top - rootRect.top, bottom: r.bottom - rootRect.top };
      });
      const textEls = Array.from(root.querySelectorAll<HTMLElement>(
        'h2, h3, p.vr-line, li, blockquote, .vr-highlight-v, .vr-card-name, .vr-card-meta, .vr-cover-intro, .vr-chapter-kicker'
      ));
      const textBounds = textEls.flatMap(el => {
        const bounds: Array<{ top: number; bottom: number }> = [];
        try {
          const range = document.createRange();
          range.selectNodeContents(el);
          Array.from(range.getClientRects()).forEach(rect => {
            if (rect.width > 1 && rect.height > 1) {
              bounds.push({ top: rect.top - rootRect.top, bottom: rect.bottom - rootRect.top });
            }
          });
          range.detach();
        } catch {
          const r = el.getBoundingClientRect();
          bounds.push({ top: r.top - rootRect.top, bottom: r.bottom - rootRect.top });
        }
        if (!bounds.length) {
          const r = el.getBoundingClientRect();
          bounds.push({ top: r.top - rootRect.top, bottom: r.bottom - rootRect.top });
        }
        return bounds;
      }).filter(b => b.bottom > b.top);

      const SCALE = 1.5;
      const canvas = await html2canvas(root, {
        scale: SCALE,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: A4_W,
        height: root.scrollHeight,
        windowWidth: A4_W,
        windowHeight: root.scrollHeight,
      });
      document.body.removeChild(host);

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      try {
        pdf.setProperties({
          title: 'Dossiê VIRUM — Perfil de Estilo Pessoal',
          subject: 'Diagnóstico de Imagem Pessoal com IA',
          author: 'VIRUM',
          creator: 'VIRUM Dossier Generator',
          keywords: 'VIRUM, diagnóstico, estilo, imagem pessoal, dossiê',
        });
      } catch { /* best-effort */ }
      const pageWmm = pdf.internal.pageSize.getWidth();
      const pageHmm = pdf.internal.pageSize.getHeight();
      const MARGIN = 15;
      const contentWmm = pageWmm - MARGIN * 2;
      const contentHmm = pageHmm - MARGIN * 2;
      const pxPerMm = canvas.width / contentWmm;
      const pageHpx = Math.floor(contentHmm * pxPerMm);
      const atomicCuts = atomicBounds.map(b => ({ top: Math.round(b.top * SCALE), bottom: Math.round(b.bottom * SCALE) }));
      const textCuts = textBounds.map(b => ({ top: Math.round(b.top * SCALE), bottom: Math.round(b.bottom * SCALE) }));
      const sourceCtx = canvas.getContext('2d', { willReadFrequently: true });
      const sampleStepX = Math.max(4, Math.floor(canvas.width / 180));
      const quietBandPx = Math.max(8, Math.round(6 * SCALE));
      const minSlicePx = Math.round(42 * SCALE);
      const searchBackPx = Math.round(300 * SCALE);

      const isQuietRow = (y: number) => {
        if (!sourceCtx || y <= 0 || y >= canvas.height) return false;
        const row = sourceCtx.getImageData(0, y, canvas.width, 1).data;
        let samples = 0, minLum = 255, maxLum = 0, dark = 0, light = 0;
        for (let x = 0; x < canvas.width; x += sampleStepX) {
          const i = x * 4;
          if (row[i + 3] < 10) continue;
          const lum = row[i] * 0.2126 + row[i + 1] * 0.7152 + row[i + 2] * 0.0722;
          minLum = Math.min(minLum, lum); maxLum = Math.max(maxLum, lum);
          if (lum < 120) dark += 1;
          if (lum > 165) light += 1;
          samples += 1;
        }
        if (!samples) return true;
        return (maxLum - minLum) < 18 || dark / samples < 0.012 || light / samples < 0.012;
      };
      const isQuietBand = (y: number) => {
        let quietRows = 0, checked = 0;
        const start = Math.max(1, y - Math.floor(quietBandPx / 2));
        const end = Math.min(canvas.height - 1, y + Math.floor(quietBandPx / 2));
        for (let row = start; row <= end; row += 2) {
          checked += 1;
          if (isQuietRow(row)) quietRows += 1;
        }
        return checked > 0 && quietRows / checked >= 0.78;
      };
      const isInsideProtectedContent = (y: number) => {
        const padding = Math.round(4 * SCALE);
        return textCuts.some(c => y > c.top - padding && y < c.bottom + padding)
          || atomicCuts.some(c => y > c.top - padding && y < c.bottom + padding);
      };
      const findQuietCut = (offsetPx: number, desiredEndPx: number) => {
        const minEndPx = offsetPx + minSlicePx;
        const searchStart = Math.min(desiredEndPx, canvas.height - 1);
        const searchEnd = Math.max(minEndPx, searchStart - searchBackPx);
        for (let y = searchStart; y >= searchEnd; y -= 2) {
          if (!isInsideProtectedContent(y) && isQuietBand(y)) return y;
        }
        return null;
      };
      const getSafeSliceHeight = (offsetPx: number) => {
        const naturalEnd = Math.min(offsetPx + pageHpx, canvas.height);
        if (naturalEnd >= canvas.height) return canvas.height - offsetPx;
        let desiredEnd = naturalEnd;
        const crossedAtomic = atomicCuts.find(c => c.top < desiredEnd && c.bottom > desiredEnd);
        if (crossedAtomic && crossedAtomic.top > offsetPx + minSlicePx && crossedAtomic.bottom - crossedAtomic.top <= pageHpx) {
          desiredEnd = crossedAtomic.top;
        }
        const quietCut = findQuietCut(offsetPx, desiredEnd);
        if (quietCut && quietCut > offsetPx + minSlicePx) return quietCut - offsetPx;
        const crossedText = textCuts
          .filter(c => c.top < desiredEnd && c.bottom > desiredEnd && c.top > offsetPx + minSlicePx && c.bottom - c.top <= pageHpx)
          .sort((a, b) => b.top - a.top)[0];
        if (crossedText) return crossedText.top - offsetPx;
        return desiredEnd - offsetPx;
      };

      let offset = 0;
      let pageIdx = 0;
      while (offset < canvas.height) {
        const sliceH = Math.max(1, getSafeSliceHeight(offset));
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, offset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const img = slice.toDataURL('image/jpeg', 0.95);
        if (pageIdx > 0) pdf.addPage();
        const renderHmm = (sliceH / canvas.width) * contentWmm;
        pdf.addImage(img, 'JPEG', MARGIN, MARGIN, contentWmm, renderHmm);
        offset += sliceH;
        pageIdx += 1;
      }

      const pdfBlob = pdf.output('blob');
      const typedBlob = pdfBlob.type === 'application/pdf'
        ? pdfBlob
        : new Blob([pdfBlob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(typedBlob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'perfil-de-estilo-virum.pdf';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      toast.success('Dossiê VIRUM baixado!', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Erro ao gerar PDF', { id: 'virum-pdf' });
    }
  };



  const isValid = (data: Record<string, unknown> | null) => data && !(data as Record<string, unknown>).error;

  const bodyType = (diagnosis.body_analysis as Record<string, unknown> | null)?.tipo_corporal as string | undefined;
  const colorSeason = (diagnosis.color_analysis as Record<string, unknown> | null)?.estacao_cor as string | undefined;
  const estacaoCor = (diagnosis.color_analysis as Record<string, unknown> | null)?.estacao as string | undefined;
  const estiloPredominante = (diagnosis.style_analysis as Record<string, unknown> | null)?.estilo_predominante as string | undefined;

  const capsuleData = diagnosis.capsule_wardrobe as Record<string, unknown> | null;
  const pecas = (capsuleData?.pecas_capsula || {}) as Record<string, unknown>;
  const topsCount = Array.isArray(pecas.tops) ? pecas.tops.length : 0;
  const bottomsCount = Array.isArray(pecas.bottoms) ? pecas.bottoms.length : 0;
  const tercasCount = Array.isArray(pecas.tercas_pecas) ? pecas.tercas_pecas.length : 0;
  const calculatedCombinations = topsCount * Math.max(bottomsCount, 1) * Math.max(tercasCount, 1);

  void isValid; void activeSection; void bodyType; void colorSeason; void estacaoCor; void estiloPredominante; void calculatedCombinations;
  const sectionImagesMap = null;
  if (diagnosis.generated_images && Object.keys(diagnosis.generated_images).length) {
    console.log('[VIRUM IMG AUDIT] STEP 6 - generated_images legado encontrado e ignorado na renderização', {
      diagnosisId: diagnosis.id,
      keys: Object.keys(diagnosis.generated_images),
    });
  }

  // Build DiagnosticData for the new image prompt builders
  const q = (diagnosis.questionnaire || {}) as Record<string, unknown>;
  const occ = Array.isArray((q as { occasions?: unknown }).occasions)
    ? ((q as { occasions: string[] }).occasions[0] ?? '')
    : (((q as { occasion?: string }).occasion) ?? '');
  const diagnostic: DiagnosticData = {
    userId: diagnosis.id,
    imageContext: buildImageContext(diagnosis),
    estiloDeVida: ((q as { lifestyle?: string }).lifestyle) || '',
    profissao: ((q as { profession?: string }).profession) || '',
    ocasiao: normalizeOcasiao(occ),
    orcamento: 'R$ 500 - R$ 1.500',
    clima: normalizeClima((q as { climate?: string }).climate),
    altura: diagnosis.height_cm || 165,
    peso: diagnosis.weight_kg || 60,
    tamanhoSuperior: diagnosis.top_size || 'M',
    tamanhoInferior: diagnosis.bottom_size || '38',
    tipoCorporal: normalizeTipoCorporal(bodyType),
    caimento: normalizeCaimento(diagnosis.fit_preference),
    formalidade: normalizeFormalidade(diagnosis.formality_level),
    observacoesCorpo: diagnosis.body_notes || undefined,
    corCabelo: (diagnosis.hair_color || '').replace(/_/g, ' '),
    corOlhos: (diagnosis.eye_color || '').replace(/_/g, ' '),
    tomDePele: normalizeTomDePele(diagnosis.skin_tone),
    estiloPersonalidade: normalizeEstilo(estiloPredominante),
    objetivos: '',
  };

  return (
    <SectionImagesProvider value={{ imagesMap: sectionImagesMap, diagnostic }}>

    <PageTransition>
      <Layout showFooter={false}>
        <div className="min-h-screen bg-background text-foreground">
          {/* ── Sticky Header ── */}
          <div className="sticky top-16 z-30 border-b border-border/30 backdrop-blur-xl bg-background/80">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <button onClick={() => navigate('/account')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-sans text-xs tracking-wide">Voltar</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <span className="hidden md:inline font-sans">
                  {new Date(diagnosis.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="flex gap-1.5">
                {canShare ? (
                  <>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary h-8" onClick={handleShareWhatsApp} disabled={sharing}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">WhatsApp</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary h-8" onClick={handleShare} disabled={sharing}>
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Compartilhar</span>
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground/60 hover:text-primary h-8" onClick={() => { toast.info('Compartilhamento disponível no plano Elite.', { action: { label: 'Ver planos', onClick: () => navigate('/pricing') } }); }}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Compartilhar</span>
                  </Button>
                )}
                {canPdf ? (
                  <Button size="sm" variant="premium" className="gap-1.5 text-xs h-8" onClick={handleDownloadPDF}>
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">PDF</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="premium" className="gap-1.5 text-xs h-8 opacity-80" onClick={() => { toast.info('Download em PDF disponível nos planos Premium e Elite.', { action: { label: 'Fazer upgrade', onClick: () => navigate('/pricing') } }); }}>
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">PDF</span>
                  </Button>
                )}
              </div>

            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
            <BookLayout diagnosis={diagnosis as unknown as DiagnosisRecord} />

            {/* ── Footer branding ── */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center mt-12 pt-8 border-t border-border/10"
            >
              <p className="text-primary/40 font-serif text-sm tracking-widest">VIRUM</p>
              <p className="text-muted-foreground/30 text-xs mt-1">Diagnóstico de estilo com inteligência artificial</p>
            </motion.div>
          </div>
        </div>
      </Layout>
    </PageTransition>
    </SectionImagesProvider>
  );
}
