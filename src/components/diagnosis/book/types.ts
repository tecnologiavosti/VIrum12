export type DiagnosisRecord = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  body_analysis: Record<string, unknown> | null;
  color_analysis: Record<string, unknown> | null;
  style_analysis: Record<string, unknown> | null;
  modeling_analysis: Record<string, unknown> | null;
  wardrobe_essentials: Record<string, unknown> | null;
  capsule_wardrobe: Record<string, unknown> | null;
  final_diagnosis: Record<string, unknown> | null;
  dossier_content?: Record<string, unknown> | null;
  strategy_analysis?: Record<string, unknown> | null;
  generated_images?: Record<string, unknown> | null;
  questionnaire: Record<string, unknown> | null;
  photo_front_url?: string | null;
  photo_side_url?: string | null;
  photo_back_url?: string | null;
  photo_face_url?: string | null;
};

export type BlockKind =
  | 'palette'
  | 'body'
  | 'wardrobe'
  | 'capsule'
  | 'timeline'
  | 'refs'
  | 'quote';

export interface ChapterContent {
  paragraphs?: string[];
  bullets?: string[];
  block?: BlockKind;
  empty?: boolean;
}

export interface Chapter {
  id: string;
  numeral: string;
  part: 1 | 2 | 3 | 4 | 5;
  title: string;
  kicker: string;
  resolve: (d: DiagnosisRecord) => ChapterContent;
}

export const PART_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Parte I · Base',
  2: 'Parte II · Código',
  3: 'Parte III · Estética',
  4: 'Parte IV · Prática',
  5: 'Parte V · Caminho',
};