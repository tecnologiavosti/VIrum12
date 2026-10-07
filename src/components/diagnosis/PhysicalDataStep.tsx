import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuestionnaireData } from "@/pages/NewDiagnosis";

interface Props {
  questionnaire: QuestionnaireData;
  setQuestionnaire: React.Dispatch<React.SetStateAction<QuestionnaireData>>;
}

// Fitzpatrick-inspired skin tone scale
const SKIN_TONES: { id: string; label: string }[] = [
  { id: "Muito Claro", label: "Muito claro" },
  { id: "Claro",       label: "Claro" },
  { id: "Médio Claro", label: "Médio claro" },
  { id: "Médio",       label: "Médio" },
  { id: "Médio Escuro", label: "Médio escuro" },
  { id: "Escuro",      label: "Escuro" },
  { id: "Muito Escuro", label: "Muito escuro" },
];

const HAIR_COLORS: { id: string; label: string }[] = [
  { id: "Preto",           label: "Preto" },
  { id: "Castanho Escuro", label: "Castanho escuro" },
  { id: "Castanho Médio",  label: "Castanho médio" },
  { id: "Castanho Claro",  label: "Castanho claro" },
  { id: "Loiro Escuro",    label: "Loiro escuro" },
  { id: "Loiro Claro",     label: "Loiro claro" },
  { id: "Ruivo",           label: "Ruivo" },
  { id: "Grisalho",        label: "Grisalho" },
  { id: "Branco",          label: "Branco" },
];

const EYE_COLORS: { id: string; label: string }[] = [
  { id: "Preto",         label: "Preto" },
  { id: "Castanho Escuro",label: "Castanho escuro" },
  { id: "Castanho Claro",label: "Castanho claro" },
  { id: "Mel",           label: "Mel" },
  { id: "Verde",         label: "Verde" },
  { id: "Azul",          label: "Azul" },
  { id: "Cinza",         label: "Cinza" },
];

// Biotipos masculinos
const BODY_TYPES: { id: string; label: string; helper: string }[] = [
  { id: "retangulo",          label: "Retângulo",           helper: "Ombros, cintura e quadril alinhados." },
  { id: "triangulo_invertido",label: "Triângulo invertido", helper: "Ombros largos, quadril mais estreito." },
  { id: "triangulo",          label: "Triângulo",           helper: "Quadril mais largo que os ombros." },
  { id: "oval",               label: "Oval",                helper: "Volume concentrado no tronco/abdômen." },
  { id: "trapezio",           label: "Trapézio",            helper: "Ombros levemente mais largos que o quadril." },
];

const EMPTY_QUESTIONNAIRE = {
  skinTone: "",
  hairColor: "",
  eyeColor: "",
  bodyType: "",
  heightCm: "",
  weightKg: "",
};

export function PhysicalDataStep({ questionnaire, setQuestionnaire }: Props) {
  // The parent owns the questionnaire state, but keep this step defensive so
  // a stale persisted/hot-reloaded render cannot blank the entire diagnosis page.
  const safeQuestionnaire = questionnaire ?? (EMPTY_QUESTIONNAIRE as QuestionnaireData);

  const set = (patch: Partial<QuestionnaireData>) =>
    setQuestionnaire((prev) => ({ ...(prev ?? EMPTY_QUESTIONNAIRE), ...patch }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl md:text-3xl text-foreground">Perfil físico</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Esses dados alimentam a colorimetria pessoal e o ajuste de modelagem.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-4 max-w-4xl mx-auto items-start">
        <div className="space-y-1.5">
          <Label htmlFor="skinTone" className="text-base font-serif leading-tight">Tom de pele</Label>
          <Select value={safeQuestionnaire.skinTone || ""} onValueChange={(v) => set({ skinTone: v })}>
            <SelectTrigger id="skinTone" className="bg-white border-border/60 rounded-xl h-11 focus:ring-primary/20">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {SKIN_TONES.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="rounded-lg">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hairColor" className="text-base font-serif leading-tight">Cor do cabelo</Label>
          <Select value={safeQuestionnaire.hairColor || ""} onValueChange={(v) => set({ hairColor: v })}>
            <SelectTrigger id="hairColor" className="bg-white border-border/60 rounded-xl h-11 focus:ring-primary/20">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {HAIR_COLORS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="rounded-lg">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="eyeColor" className="text-base font-serif leading-tight">Cor dos olhos</Label>
          <Select value={safeQuestionnaire.eyeColor || ""} onValueChange={(v) => set({ eyeColor: v })}>
            <SelectTrigger id="eyeColor" className="bg-white border-border/60 rounded-xl h-11 focus:ring-primary/20">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {EYE_COLORS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id} className="rounded-lg">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-serif text-foreground">Biotipo</h3>
          <p className="text-xs text-muted-foreground leading-tight">
            Como você percebe o seu formato corporal? Calibra modelagem e proporção.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {BODY_TYPES.map((opt) => {
            const selected = safeQuestionnaire.bodyType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => set({ bodyType: opt.id })}
                className={`relative text-left rounded-xl border p-2 transition-all min-h-[54px] flex flex-col justify-center
                  ${selected
                    ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
                    : "border-border/60 bg-card/60 hover:border-primary/50"}`}
              >
                <div className="text-xs font-semibold text-foreground leading-tight">{opt.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{opt.helper}</div>
                {selected && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="heightCm" className="text-xs font-medium">Altura (cm)</Label>
          <Input
            id="heightCm"
            type="number"
            inputMode="numeric"
            min={120}
            max={230}
            placeholder="175"
            className="h-10 rounded-xl"
            value={safeQuestionnaire.heightCm || ""}
            onChange={(e) => set({ heightCm: e.target.value.replace(/\D/g, "").slice(0, 3) })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="weightKg" className="text-xs font-medium">Peso (kg)</Label>
          <Input
            id="weightKg"
            type="number"
            inputMode="numeric"
            min={35}
            max={220}
            placeholder="72"
            className="h-10 rounded-xl"
            value={safeQuestionnaire.weightKg || ""}
            onChange={(e) => set({ weightKg: e.target.value.replace(/\D/g, "").slice(0, 3) })}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground sm:col-span-2 leading-tight">
        Altura e peso são usados apenas para ajustar modelagem e proporção das peças.
      </p>
    </div>
  );
}
