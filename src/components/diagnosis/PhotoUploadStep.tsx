import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { DiagnosisPhotos } from '@/pages/NewDiagnosis';

const frenteAsset = { url: '/photo-guides/frente.png' };
const lateralAsset = { url: '/photo-guides/lateral.png' };
const costasAsset = { url: '/photo-guides/costas.png' };
const rostoAsset = { url: '/photo-guides/rosto.png' };

interface PhotoUploadStepProps {
  photos: DiagnosisPhotos;
  setPhotos?: React.Dispatch<React.SetStateAction<DiagnosisPhotos>>;
  onPhotosChange?: React.Dispatch<React.SetStateAction<DiagnosisPhotos>>;
}

type PhotoType = keyof DiagnosisPhotos;
type SlotState = 'idle' | 'loading' | 'error';

const photoConfig: {
  type: PhotoType;
  label: string;
  guide: string;
  tips: string[];
}[] = [
  { type: 'front', label: 'Frente', guide: frenteAsset.url, tips: ['Corpo inteiro', 'Câmera reta', 'Braços relaxados', 'Iluminação clara', 'Fundo neutro'] },
  { type: 'side', label: 'Lateral', guide: lateralAsset.url, tips: ['Perfil completo', 'Postura natural', 'Braços afastados', 'Corpo inteiro', 'Fundo neutro'] },
  { type: 'back', label: 'Costas', guide: costasAsset.url, tips: ['Costas totalmente visíveis', 'Corpo inteiro', 'Postura natural'] },
  { type: 'face', label: 'Rosto', guide: rostoAsset.url, tips: ['Sem filtro', 'Rosto centralizado', 'Iluminação frontal'] },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploadStep({ photos, setPhotos, onPhotosChange }: PhotoUploadStepProps) {
  // Aceita os dois nomes de callback para manter compatibilidade com versões do NewDiagnosis/Lovable.
  const updatePhotos = setPhotos ?? onPhotosChange;
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const [slotState, setSlotState] = useState<Record<PhotoType, SlotState>>({ front: 'idle', side: 'idle', back: 'idle', face: 'idle' });

  const photoUrls = useMemo(() => {
    const urls: Partial<Record<PhotoType, string>> = {};
    for (const type of ['front', 'side', 'back', 'face'] as PhotoType[]) {
      const file = photos[type];
      const oldUrl = objectUrlsRef.current.get(type);
      if (file) {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        const newUrl = URL.createObjectURL(file);
        objectUrlsRef.current.set(type, newUrl);
        urls[type] = newUrl;
      } else if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        objectUrlsRef.current.delete(type);
      }
    }
    return urls;
  }, [photos]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const handleFileChange = useCallback((type: PhotoType, file: File | null) => {
    if (!updatePhotos) {
      toast.error('Não foi possível preparar o envio da foto. Recarregue a página e tente novamente.');
      return;
    }
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
        setSlotState(s => ({ ...s, [type]: 'error' }));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Arquivo muito grande. O tamanho máximo é 5MB.');
        setSlotState(s => ({ ...s, [type]: 'error' }));
        return;
      }
      setSlotState(s => ({ ...s, [type]: 'loading' }));
      setTimeout(() => setSlotState(s => ({ ...s, [type]: 'idle' })), 300);
    } else {
      setSlotState(s => ({ ...s, [type]: 'idle' }));
    }
    updatePhotos(prev => ({ ...prev, [type]: file }));
  }, [updatePhotos]);

  return (
    <div className="mx-auto max-w-6xl rounded-3xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 md:p-10 shadow-xl">
      <div className="text-center mb-10 space-y-3">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">Como tirar suas <span className="text-gold-400">fotos</span></h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">Siga os exemplos abaixo para capturar fotos com o enquadramento correto. Isso melhora significativamente a precisão da análise realizada pela IA.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {photoConfig.map(({ type, label, guide, tips }) => {
          const file = photos[type];
          const url = photoUrls[type];
          const state = slotState[type];
          const displaySrc = url || guide;
          const isUserPhoto = Boolean(file && url);
          return (
            <div key={type} className="group relative rounded-2xl border border-border/60 bg-background/60 overflow-hidden transition-all duration-300 hover:border-gold-400/60 hover:shadow-[0_8px_30px_-8px_rgba(198,167,78,0.35)] hover:-translate-y-0.5 flex flex-col">
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                <img src={displaySrc} alt={`${label} — ${isUserPhoto ? 'sua foto' : 'exemplo'}`} className={`w-full h-full object-cover transition-all duration-500 ${isUserPhoto ? 'animate-fade-in' : 'opacity-70 group-hover:opacity-90'}`} />
                {!isUserPhoto && <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-[10px] uppercase tracking-widest text-muted-foreground border border-border/60">Exemplo</div>}
                {state === 'loading' && <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center"><div className="w-2/3 h-1 rounded-full bg-muted overflow-hidden"><div className="h-full w-1/3 bg-gold-400 animate-[slide-in-right_1s_ease-in-out_infinite]" /></div></div>}
                {state === 'error' && <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2"><AlertCircle className="w-7 h-7 text-destructive" /><span className="text-xs text-destructive">Falha ao carregar</span></div>}
                {isUserPhoto && <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleFileChange(type, null); }} className="absolute top-3 right-3 z-20 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80 active:scale-95 transition-all shadow-lg" aria-label={`Remover foto ${label}`}><X className="w-4 h-4" /></button>}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
                <label className="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 cursor-pointer">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { handleFileChange(type, e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-gold-400 text-black shadow-lg ring-4 ring-background/60 hover:scale-105 active:scale-95 transition-transform" aria-label={`Enviar foto ${label}`}><Upload className="w-5 h-5" /></span>
                </label>
              </div>
              <div className="px-4 pt-4 pb-5 flex flex-col gap-3 text-center">
                <div><div className="text-base font-serif font-semibold text-foreground">{label}</div><div className="text-[11px] uppercase tracking-widest text-gold-400/90 mt-0.5">{isUserPhoto ? 'Clique para trocar' : 'Clique para enviar'}</div></div>
                <ul className="text-left space-y-1.5 mt-1">{tips.map((tip) => <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug"><Check className="w-3.5 h-3.5 mt-0.5 text-gold-400 shrink-0" /><span>{tip}</span></li>)}</ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
