import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useDiagnosticFormImages } from "@/hooks/useDiagnosticFormImages";
import { QUESTIONS, STEPS, type Question } from "./questions";
import { mapToLegacyQuestionnaire } from "./mapToLegacyQuestionnaire";
import type { Answers } from "./computeStyleWeights";
import type { QuestionnaireData } from "@/pages/NewDiagnosis";

const STORAGE_KEY = "virum_form_v2_answers";

interface Props {
  questionnaire: QuestionnaireData;
  setQuestionnaire: React.Dispatch<React.SetStateAction<QuestionnaireData>>;
  onLastStepChange?: (isLastStep: boolean) => void;
}

export function QuestionnaireV2({ questionnaire, setQuestionnaire, onLastStepChange }: Props) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>(() => {
    // As respostas anteriores só podem ser reaproveitadas enquanto existe um
    // diagnóstico em andamento. Um novo diagnóstico sempre começa em branco.
    if (!sessionStorage.getItem("diagnosis_active_id")) {
      sessionStorage.removeItem(STORAGE_KEY);
      return {};
    }
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });
  const { images, loading: imagesLoading } = useDiagnosticFormImages();

  // Persist answers + push merged questionnaire upstream on every change.
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch { /* quota */ }
    setQuestionnaire((prev) => mapToLegacyQuestionnaire(answers, prev));
     
  }, [answers]);

  const stepQuestions = useMemo(() => QUESTIONS.filter((q) => q.step === step), [step]);
  const total = STEPS.length;
  const progress = (step / total) * 100;

  useEffect(() => {
    onLastStepChange?.(step === total);
  }, [step, total, onLastStepChange]);

  const validateStep = (): boolean => {
    const missing = stepQuestions.filter((q) => {
      const v = answers[q.id];
      if (q.type === "multi") return !Array.isArray(v) || v.length === 0;
      if (q.type === "slider") return v == null;
      if (q.type === "text") {
        const s = typeof v === "string" ? v.trim() : "";
        return s.length < (q.minLength ?? 1);
      }
      return !v;
    });
    if (missing.length > 0) {
      const first = missing[0];
      if (first?.type === "text") {
        toast.error(`Escreva ao menos ${first.minLength ?? 1} caracteres em "${first.title}".`);
      } else {
        toast.error("Responda todas as perguntas desta etapa para continuar.");
      }
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < total) setStep(step + 1);
  };
  const goBack = () => step > 1 && setStep(step - 1);

  const handleSelect = (q: Question, optId: string) => {
    if (q.type === "single" || q.type === "image-single") {
      setAnswers((a) => ({ ...a, [q.id]: optId }));
      return;
    }
    if (q.type === "multi") {
      setAnswers((a) => {
        const cur = Array.isArray(a[q.id]) ? [...(a[q.id] as string[])] : [];
        const idx = cur.indexOf(optId);
        if (idx >= 0) cur.splice(idx, 1);
        else if (!q.max || cur.length < q.max) cur.push(optId);
        else { toast.info(`Selecione no máximo ${q.max} opções.`); return a; }
        return { ...a, [q.id]: cur };
      });
    }
  };

  const handleSlider = (q: Question, v: number) => {
    setAnswers((a) => ({ ...a, [q.id]: v }));
  };

  const handleText = (q: Question, v: string) => {
    const capped = q.maxLength ? v.slice(0, q.maxLength) : v;
    setAnswers((a) => ({ ...a, [q.id]: capped }));
  };

  const currentStepMeta = STEPS[step - 1];

  return (
    <div className="space-y-8">
      {/* Progress header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-widest">Etapa {step} de {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-muted" />
        <div className="pt-2 text-center">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground">
            {currentStepMeta.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            {currentStepMeta.description}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-10"
        >
          {stepQuestions.map((q) => (
            <QuestionBlock
              key={q.id}
              q={q}
              answer={answers[q.id]}
              onSelect={(id) => handleSelect(q, id)}
              onSlider={(v) => handleSlider(q, v)}
              onText={(v) => handleText(q, v)}
              images={q.imageCategory ? images[q.imageCategory] || [] : []}
              imagesLoading={imagesLoading}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-border/50">
        <Button variant="outline" onClick={goBack} disabled={step === 1} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1 mx-2 flex justify-center gap-1.5">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                s.id === step ? "w-8 bg-primary" : s.id < step ? "w-3 bg-primary/60" : "w-3 bg-muted"
              }`}
            />
          ))}
        </div>
        {step < total ? (
          <Button variant="premium" onClick={goNext} className="gap-2">
            Continuar <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground text-right">
            Clique em <span className="text-primary font-semibold">Iniciar Análise</span> abaixo
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

interface BlockProps {
  q: Question;
  answer: string | string[] | number | undefined;
  onSelect: (id: string) => void;
  onSlider: (v: number) => void;
  onText: (v: string) => void;
  images: { image_url: string; position: number; photographer: string | null }[];
  imagesLoading: boolean;
}

function QuestionBlock({ q, answer, onSelect, onSlider, onText, images, imagesLoading }: BlockProps) {
  const selectedIds: string[] = Array.isArray(answer) ? (answer as string[]) : [];
  const textValue = typeof answer === "string" && q.type === "text" ? answer : "";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg md:text-xl font-serif text-foreground">{q.title}</h3>
        {q.helper && <p className="text-xs text-muted-foreground">{q.helper}</p>}
        {q.type === "multi" && q.max && (
          <p className="text-xs text-primary/80">
            {selectedIds.length}/{q.max} selecionadas
          </p>
        )}
      </div>

      {q.type === "slider" && (
        <div className="px-2 py-4">
          <Slider
            min={q.min || 1}
            max={q.max || 5}
            step={1}
            value={[Number(answer ?? Math.round(((q.min || 1) + (q.max || 5)) / 2))]}
            onValueChange={(v) => onSlider(v[0])}
          />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{q.min || 1}</span>
            <span className="text-primary font-semibold text-sm">
              {answer ?? "-"}
            </span>
            <span>{q.max || 5}</span>
          </div>
        </div>
      )}

      {q.type === "text" && (
        <div className="space-y-2">
          <Textarea
            value={textValue}
            onChange={(e) => onText(e.target.value)}
            placeholder={q.placeholder}
            maxLength={q.maxLength}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end text-xs text-muted-foreground">
            {textValue.length}{q.maxLength ? `/${q.maxLength}` : ""}
          </div>
        </div>
      )}

      {(q.type === "single" || q.type === "multi") && q.options && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {q.options.map((opt) => {
            const isSelected = q.type === "multi"
              ? selectedIds.includes(opt.id)
              : answer === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`group relative text-left rounded-xl border p-4 text-sm transition-all
                  ${isSelected
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                    : "border-border/60 bg-card/60 hover:border-primary/50 hover:bg-primary/5 text-foreground"}
                `}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "image-single" && (
        <div className="space-y-3">
          {imagesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((pos) => {
                const img = images.find((i) => i.position === pos);
                const optId = `pos_${pos}`;
                const isSelected = answer === optId;
                if (!img) {
                  return (
                    <div
                      key={pos}
                      className="aspect-[4/5] rounded-xl border border-dashed border-border/60 bg-muted/30 flex items-center justify-center text-[11px] text-muted-foreground text-center px-2"
                    >
                      Imagem não cadastrada
                    </div>
                  );
                }
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onSelect(optId)}
                    className={`relative overflow-hidden rounded-xl border transition-all group
                      ${isSelected ? "border-primary ring-2 ring-primary" : "border-border/60 hover:border-primary/60"}
                    `}
                  >
                    <div className="aspect-[4/5] bg-muted">
                      <img
                        src={img.image_url}
                        alt={img.photographer ? `Foto por ${img.photographer}` : "Referência visual"}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    </div>
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
