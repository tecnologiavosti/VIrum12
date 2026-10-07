import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PhotoUploadStep } from '@/components/diagnosis/PhotoUploadStep';
import { PhysicalDataStep } from '@/components/diagnosis/PhysicalDataStep';
import { QuestionnaireStep } from '@/components/diagnosis/QuestionnaireStep';
import { ProcessingStep } from '@/components/diagnosis/ProcessingStep';
import type { Json } from '@/integrations/supabase/types';

export type DiagnosisPhotos = {
  front: File | null;
  side: File | null;
  back: File | null;
  face: File | null;
};

export type QuestionnaireData = {
  lifestyle: string;
  profession: string;
  occasions: string[];
  preferences: string[];
  budget: string;
  climate: string;
  goals: string;
  bodyType: string;
  height: string;
  challenges: string;
  heightCm: string;
  weightKg: string;
  topSize: string;
  bottomSize: string;
  shoeSize: string;
  bodyNotes: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  fitPreference: string;
  formalityLevel: string;
  ageRange?: string;
  expectations?: string;
  wardrobeOwned?: string[];
  wardrobeAvoided?: string[];
  renewalIntensity?: string;
  alterationsOk?: string;
  featuresToEnhance?: string;
  insecurities?: string;
  identityPieces?: string;
  personalRules?: string;
  colorsAvoided?: string[];
  fabricsAvoided?: string[];
  notTransmit?: string[];
  professionDetail?: string;
  workEnvironment?: string;
};

const steps = [
  { id: 1, name: 'Fotos', description: 'Upload das suas fotos' },
  { id: 2, name: 'Perfil Físico', description: 'Dados para a paleta e modelagem' },
  { id: 3, name: 'Questionário', description: 'Conte-nos sobre você' },
  { id: 4, name: 'Processamento', description: 'Análise com IA' },
];

const SECTION_ORDER = ['body', 'strategy', 'color', 'style', 'modeling', 'essentials', 'capsule', 'final'] as const;
const SECTION_COLUMN: Record<string, string> = { body: 'body_analysis', strategy: 'strategy_analysis', color: 'color_analysis', style: 'style_analysis', modeling: 'modeling_analysis', essentials: 'wardrobe_essentials', capsule: 'capsule_wardrobe', final: 'final_diagnosis' };
const MAX_SECTION_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function NewDiagnosis() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [debugLoading, setDebugLoading] = useState(false);
  const processingRef = useRef<string | null>(null);

  const [photos, setPhotos] = useState<DiagnosisPhotos>(() => {
    const saved = sessionStorage.getItem('diagnosis_photos_cache');
    // Fotos só devem ser restauradas para retomar um diagnóstico que já foi
    // criado. Ao iniciar um novo, nunca reaproveitamos fotos anteriores.
    const activeDiagnosisId = sessionStorage.getItem('diagnosis_active_id');
    if (saved && activeDiagnosisId) {
      try {
        const parsed = JSON.parse(saved) as Record<string, { dataUrl: string; name: string; type: string }>;
        const restored: DiagnosisPhotos = { front: null, side: null, back: null, face: null };
        let hasAny = false;
        for (const key of ['front', 'side', 'back', 'face'] as const) {
          if (parsed[key]) {
            const { dataUrl, name, type } = parsed[key];
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            restored[key] = new File([ab], name, { type });
            hasAny = true;
          }
        }
        if (hasAny) return restored;
      } catch { /* ignore */ }
    }
    if (!activeDiagnosisId) sessionStorage.removeItem('diagnosis_photos_cache');
    return { front: null, side: null, back: null, face: null };
  });

  useEffect(() => { if (!authLoading && !user) { toast.error('Você precisa estar logada para iniciar um diagnóstico.'); navigate('/auth'); } }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadProfileData(); }, [user]);
  useEffect(() => {
    const savePhotos = async () => {
      const cache: Record<string, { dataUrl: string; name: string; type: string }> = {};
      for (const key of ['front', 'side', 'back', 'face'] as const) {
        const file = photos[key];
        if (file) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); });
          cache[key] = { dataUrl, name: file.name, type: file.type };
        }
      }
      if (Object.keys(cache).length > 0) { try { sessionStorage.setItem('diagnosis_photos_cache', JSON.stringify(cache)); } catch { /* quota */ } }
      else sessionStorage.removeItem('diagnosis_photos_cache');
    };
    savePhotos();
  }, [photos]);

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({ lifestyle: '', profession: '', occasions: [], preferences: [], budget: '', climate: '', goals: '', bodyType: '', height: '', challenges: '', heightCm: '', weightKg: '', topSize: '', bottomSize: '', shoeSize: '', bodyNotes: '', hairColor: '', eyeColor: '', skinTone: '', fitPreference: '', formalityLevel: '', ageRange: '', expectations: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [retryInSeconds, setRetryInSeconds] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isQuestionnaireLastStep, setIsQuestionnaireLastStep] = useState(false);

  const loadProfileData = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (data) {
        const p = data as any;
        setQuestionnaire(prev => ({ ...prev, heightCm: p.height_cm ? String(p.height_cm) : prev.heightCm, weightKg: p.weight_kg ? String(p.weight_kg) : prev.weightKg, topSize: p.top_size || prev.topSize, bottomSize: p.bottom_size || prev.bottomSize, shoeSize: p.shoe_size || prev.shoeSize, bodyType: p.body_type || prev.bodyType, bodyNotes: p.body_notes || prev.bodyNotes, hairColor: p.hair_color || prev.hairColor, eyeColor: p.eye_color || prev.eyeColor, skinTone: p.skin_tone || prev.skinTone, fitPreference: p.fit_preference || prev.fitPreference, formalityLevel: p.formality_level || prev.formalityLevel }));
      }
    } catch (err) { console.error('Error loading profile:', err); }
  };

  const progress = (currentStep / steps.length) * 100;
  const canProceedStep1 = !!(photos.front && photos.side && photos.back && photos.face);
  const requiredStep2: { key: keyof QuestionnaireData; label: string }[] = [
    { key: 'skinTone', label: 'Tom de pele' }, { key: 'hairColor', label: 'Cor do cabelo' }, { key: 'eyeColor', label: 'Cor dos olhos' }, { key: 'bodyType', label: 'Biotipo' }, { key: 'heightCm', label: 'Altura' }, { key: 'weightKg', label: 'Peso' },
  ];
  const missingStep2 = requiredStep2.filter((f) => !String(questionnaire[f.key] ?? '').trim());
  const canProceedStep2 = missingStep2.length === 0;
  const requiredStep3: { key: keyof QuestionnaireData; label: string }[] = [
    { key: 'lifestyle', label: 'Estilo de vida' }, { key: 'profession', label: 'Profissão' }, { key: 'budget', label: 'Orçamento' }, { key: 'climate', label: 'Clima' }, { key: 'goals', label: 'Objetivos' },
  ];
  const missingStep3 = requiredStep3.filter((f) => !String(questionnaire[f.key] ?? '').trim());
  const canProceedStep3 = missingStep3.length === 0;

  const uploadPhoto = async (file: File, type: string, diagId: string): Promise<string | null> => {
    const mimeExtMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };
    let fileExt = mimeExtMap[file.type?.toLowerCase() ?? ''];
    if (!fileExt) { const nameParts = file.name.split('.'); if (nameParts.length > 1) { const candidate = nameParts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, ''); if (candidate && candidate.length <= 5) fileExt = candidate; } }
    if (!fileExt) fileExt = 'jpg';
    const { data: sess } = await supabase.auth.getSession();
    if (!sess?.session) { toast.error('Sessão expirada. Faça login novamente.'); navigate('/auth'); return null; }
    const uid = sess.session.user.id;
    const fileName = `${uid}/${diagId}/${type}.${fileExt}`;
    const contentType = file.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    const { error } = await supabase.storage.from('diagnosis-photos').upload(fileName, file, { upsert: true, contentType, cacheControl: '3600' });
    if (error) { console.error(`Error uploading ${type}:`, error); toast.error(`Erro ao enviar foto ${type}: ${error.message}`); return null; }
    const { data } = supabase.storage.from('diagnosis-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const calculateStyleScore = () => {
    const styleMap: Record<string, string> = { classic: 'Clássico', romantic: 'Romântico', modern: 'Moderno', bold: 'Ousado', bohemian: 'Boho', elegant: 'Elegante' };
    const scores: Record<string, number> = {};
    Object.keys(styleMap).forEach(key => { scores[styleMap[key]] = questionnaire.preferences.includes(key) ? 85 : 20; });
    return scores;
  };

  const fetchDiagnosisRow = async (id: string): Promise<Record<string, unknown> | null> => {
    const { data, error } = await supabase.from('diagnoses').select('*').eq('id', id).maybeSingle();
    if (error) { console.error('[NewDiagnosis] ERROR fetch diagnosis', id, error.message); return null; }
    return (data as unknown as Record<string, unknown>) || null;
  };
  const isSectionFilled = (row: Record<string, unknown>, section: string): boolean => { const col = SECTION_COLUMN[section]; if (!(col in row)) return true; const value = row[col]; if (!value) return false; if (typeof value === 'object') { const obj = value as Record<string, unknown>; if (obj.error) return false; return Object.keys(obj).length > 0; } return true; };
  const pendingSectionFor = (row: Record<string, unknown>): string | null => SECTION_ORDER.find((section) => !isSectionFilled(row, section)) ?? null;

  const readFunctionError = async (error: { message?: string; context?: unknown }): Promise<{ status?: number; payload: Record<string, unknown>; retryAfter?: number }> => {
    const context = error.context;
    if (!(context instanceof Response)) return { payload: {}, status: (context as { status?: number } | undefined)?.status };
    let payload: Record<string, unknown> = {};
    try { payload = await context.clone().json(); } catch { /* ignore */ }
    const status = context.status;
    const retryAfterHeader = context.headers.get('Retry-After');
    return { status, payload, retryAfter: retryAfterHeader ? Number(retryAfterHeader) : undefined };
  };

  const processNext = async (diagId: string, section: string, attempt: number): Promise<void> => {
    if (attempt === 0) setRetryInSeconds(0);
    const { data, error } = await supabase.functions.invoke('process-diagnosis', { body: { diagnosisId: diagId, section } });
    if (error) {
      const parsed = await readFunctionError(error);
      const message = typeof parsed.payload?.error === 'string' ? parsed.payload.error : (error.message || 'Erro ao processar diagnóstico.');
      if (parsed.status === 429 || parsed.status === 546 || parsed.status === 504) {
        const waitSeconds = Math.max(5, Math.min(60, Number(parsed.retryAfter) || 15));
        setRetryInSeconds(waitSeconds);
        await sleep(waitSeconds * 1000);
        return processNext(diagId, section, attempt + 1);
      }
      if (parsed.status === 502 || parsed.status === 402 || parsed.status === 401) {
        const providerMessage = parsed.status === 402 || /crédito|credito|cota|cobrança/i.test(message)
          ? 'O provedor de IA está sem crédito/cota no momento. O diagnóstico foi salvo e pode ser retomado quando houver um provedor disponível.'
          : 'A IA não está disponível no momento. O diagnóstico foi salvo e pode ser retomado em alguns instantes.';
        toast.error(providerMessage); setProcessingError(providerMessage); setIsProcessing(false); return;
      }
      const row = await fetchDiagnosisRow(diagId);
      if (row && isSectionFilled(row, section)) { const next = pendingSectionFor(row); if (!next) { sessionStorage.removeItem('diagnosis_active_id'); setIsProcessing(false); return; } return processNext(diagId, next, 0); }
      if (attempt < MAX_SECTION_ATTEMPTS) { const waitSeconds = Math.min(30, 5 * (attempt + 1)); await sleep(waitSeconds * 1000); return processNext(diagId, section, attempt + 1); }
      toast.error(message); setProcessingError(message); setIsProcessing(false); return;
    }
    if (data?.success !== true && data?.alreadyCompleted !== true) { const message = data?.error || 'O processamento retornou um erro inesperado.'; toast.error(message); setProcessingError(message); setIsProcessing(false); return; }
    if (data?.completed === true || !data?.nextSection) { sessionStorage.removeItem('diagnosis_active_id'); setIsProcessing(false); return; }
    if (Number(data?.retryAfter) > 0) await sleep(Number(data.retryAfter) * 1000);
    return processNext(diagId, data.nextSection, 0);
  };

  const runProcessing = async (diagId: string, startSection?: string) => {
    if (processingRef.current === diagId) return;
    processingRef.current = diagId; setProcessingError(null); setRetryInSeconds(0); setDiagnosisId(diagId); setIsProcessing(true); setCurrentStep(4);
    try { let section = startSection; if (!section) { const row = await fetchDiagnosisRow(diagId); if (row && row.status === 'completed') { sessionStorage.removeItem('diagnosis_active_id'); setIsProcessing(false); return; } section = (row ? pendingSectionFor(row) : 'body') || 'body'; } await processNext(diagId, section, 0); }
    catch (err) { console.error(`[NewDiagnosis] ERROR diagnosis=${diagId} exceção inesperada`, err); toast.error('Erro inesperado durante o processamento. O diagnóstico pode ser retomado.'); setProcessingError('Erro inesperado durante o processamento. O diagnóstico pode ser retomado.'); setIsProcessing(false); }
    finally { processingRef.current = null; }
  };

  useEffect(() => {
    if (!user) return;
    const activeId = sessionStorage.getItem('diagnosis_active_id');
    if (!activeId || processingRef.current) return;
    (async () => { const row = await fetchDiagnosisRow(activeId); if (!row || row.user_id !== user.id) { sessionStorage.removeItem('diagnosis_active_id'); return; } if (row.status === 'completed') { sessionStorage.removeItem('diagnosis_active_id'); return; } const pending = pendingSectionFor(row); if (!pending) { sessionStorage.removeItem('diagnosis_active_id'); return; } await runProcessing(activeId, pending); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleStartProcessing = async () => {
    if (!user) { toast.error('Você precisa estar logado'); navigate('/auth'); return; }
    setIsProcessing(true); setCurrentStep(4);
    try { await supabase.from('profiles').update({ height_cm: questionnaire.heightCm ? parseInt(questionnaire.heightCm) : null, weight_kg: questionnaire.weightKg ? parseInt(questionnaire.weightKg) : null, hair_color: questionnaire.hairColor || null, eye_color: questionnaire.eyeColor || null, skin_tone: questionnaire.skinTone || null } as never).eq('user_id', user.id); } catch (err) { console.warn('Could not persist physical data to profile:', err); }
    try {
      const styleScore = calculateStyleScore();
      const normalizedQuestionnaire = { ...questionnaire, age: questionnaire.ageRange || '', socialRoutine: questionnaire.lifestyle, routine: questionnaire.lifestyle, professionDetail: questionnaire.professionDetail || questionnaire.profession, work: questionnaire.professionDetail || questionnaire.profession, workContext: questionnaire.professionDetail || questionnaire.profession, workEnvironment: questionnaire.workEnvironment || questionnaire.formalityLevel, style: questionnaire.preferences, preferredStyles: questionnaire.preferences, formality: questionnaire.formalityLevel, objectives: questionnaire.goals, difficulties: questionnaire.challenges, painPoints: questionnaire.challenges, desiredPerception: questionnaire.expectations || '', likedPieces: questionnaire.wardrobeOwned || [], favoritePieces: questionnaire.wardrobeOwned || [], avoids: questionnaire.wardrobeAvoided || [], dislikedPieces: questionnaire.wardrobeAvoided || [], preferredColors: questionnaire.preferences, avoidedColors: questionnaire.colorsAvoided || [], currentWardrobe: questionnaire.wardrobeOwned || [], wardrobe: questionnaire.wardrobeOwned || [], usageFrequency: questionnaire.renewalIntensity || '', priorities: questionnaire.featuresToEnhance || '', identityPieces: questionnaire.identityPieces || '', personalRules: questionnaire.personalRules || '', notTransmit: questionnaire.notTransmit || [] };
      const insertData: Record<string, unknown> = { user_id: user.id, questionnaire: normalizedQuestionnaire as unknown as Json, status: 'processing', height_cm: questionnaire.heightCm ? parseInt(questionnaire.heightCm) : null, weight_kg: questionnaire.weightKg ? parseInt(questionnaire.weightKg) : null, top_size: questionnaire.topSize || null, bottom_size: questionnaire.bottomSize || null, shoe_size: questionnaire.shoeSize || null, body_notes: questionnaire.bodyNotes || null, hair_color: questionnaire.hairColor || null, eye_color: questionnaire.eyeColor || null, skin_tone: questionnaire.skinTone || null, fit_preference: questionnaire.fitPreference || null, formality_level: questionnaire.formalityLevel || null, style_intensity_score: styleScore as unknown as Json };
      const { data: diagnosis, error: diagError } = await supabase.from('diagnoses').insert([insertData] as any).select().single();
      if (diagError) throw diagError;
      setDiagnosisId(diagnosis.id);
      const [frontUrl, sideUrl, backUrl, faceUrl] = await Promise.all([photos.front ? uploadPhoto(photos.front, 'front', diagnosis.id) : null, photos.side ? uploadPhoto(photos.side, 'side', diagnosis.id) : null, photos.back ? uploadPhoto(photos.back, 'back', diagnosis.id) : null, photos.face ? uploadPhoto(photos.face, 'face', diagnosis.id) : null]);
      await supabase.from('diagnoses').update({ photo_front_url: frontUrl, photo_side_url: sideUrl, photo_back_url: backUrl, photo_face_url: faceUrl }).eq('id', diagnosis.id);
      // Os arquivos já estão no Storage; não mantenha cópias das fotos no
      // navegador depois que um diagnóstico foi criado.
      sessionStorage.removeItem('diagnosis_photos_cache');
      sessionStorage.setItem('diagnosis_active_id', diagnosis.id);
      await runProcessing(diagnosis.id);
    } catch (error) { console.error('Processing error:', error); toast.error('Erro ao processar diagnóstico. Tente novamente.'); setCurrentStep(3); setIsProcessing(false); }
  };

  const handleNext = () => {
    if (currentStep === 1) { if (canProceedStep1) setCurrentStep(2); else toast.error('Envie as 4 fotos (frente, lateral, costas e rosto) antes de continuar.'); }
    else if (currentStep === 2) { if (canProceedStep2) setCurrentStep(3); else toast.error(`Preencha: ${missingStep2.map((m) => m.label).join(', ')}`); }
    else if (currentStep === 3) { if (canProceedStep1 && canProceedStep2 && canProceedStep3) handleStartProcessing(); else if (!canProceedStep1) toast.error('Envie as 4 fotos (frente, lateral, costas e rosto) antes de iniciar a análise.'); else if (!canProceedStep2) toast.error(`Complete o perfil físico: ${missingStep2.map((m) => m.label).join(', ')}`); else toast.error(`Preencha os campos obrigatórios: ${missingStep3.map((m) => m.label).join(', ')}`); }
  };
  const handleBack = () => { if (currentStep > 1 && !isProcessing) setCurrentStep(currentStep - 1); };

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8"><div className="flex items-center justify-between mb-2"><h1 className="text-2xl font-semibold">Novo diagnóstico</h1><span className="text-sm text-muted-foreground">Etapa {currentStep} de {steps.length}</span></div><Progress value={progress} /></div>
        {currentStep === 1 && <PhotoUploadStep photos={photos} onPhotosChange={setPhotos} />}
        {currentStep === 2 && <PhysicalDataStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} />}
        {currentStep === 3 && <QuestionnaireStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} onLastStepChange={setIsQuestionnaireLastStep} />}
        {currentStep === 4 && (
          <ProcessingStep
            diagnosisId={diagnosisId}
            retryInSeconds={retryInSeconds}
            isPaused={Boolean(processingError)}
            errorMessage={processingError}
            onRetry={diagnosisId ? () => void runProcessing(diagnosisId) : undefined}
            onComplete={(id) => {
              sessionStorage.removeItem('diagnosis_active_id');
              navigate(`/diagnosis/${id}`);
            }}
          />
        )}
        <div className="mt-8 flex justify-between"><Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isProcessing}><ChevronLeft className="mr-2 h-4 w-4" />Voltar</Button>{currentStep < 3 && <Button onClick={handleNext}><ChevronRight className="ml-2 h-4 w-4" />Continuar</Button>}{currentStep === 3 && isQuestionnaireLastStep && <Button onClick={handleNext} disabled={isProcessing || !canProceedStep3}>{isProcessing ? 'Gerando diagnóstico...' : 'Gerar diagnóstico'}<ChevronRight className="ml-2 h-4 w-4" /></Button>}</div>
      </div>
    </Layout>
  );
}
