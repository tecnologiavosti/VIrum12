// VIRUM — Shared image types and PT→enum normalizers.
// All image ACQUISITION now happens via Pexels/Unsplash edge functions.
// This file no longer contains any generator URL builder.

import type {
  OcasiaoType, ClimaType, TipoCorporalType,
  CaimentoType, FormalidadeType, TomDePeleType, EstiloType,
} from '@/types/diagnostic';

export type SectionId =
  | 'resumo'
  | 'corpo'
  | 'cores'
  | 'estilo'
  | 'modelagens'
  | 'essenciais'
  | 'capsula';

// ─── Normalizers (DB strings → typed enums) ────────────────────────────────

export function normalizeOcasiao(raw?: string | null): OcasiaoType {
  const k = (raw || '').toLowerCase();
  if (k.includes('trabalho') || k.includes('escrit') || k.includes('office') || k.includes('work')) return 'Trabalho/Escritório';
  if (k.includes('formal') || k.includes('gala')) return 'Ocasiões formais';
  if (k.includes('evento') || k.includes('social') || k.includes('cocktail')) return 'Eventos sociais';
  if (k.includes('esporte') || k.includes('academ') || k.includes('gym') || k.includes('sport')) return 'Esportes/Academia';
  if (k.includes('viag') || k.includes('travel')) return 'Viagens';
  return 'Casual/Dia a dia';
}

export function normalizeClima(raw?: string | null): ClimaType {
  const k = (raw || '').toLowerCase();
  if (k.includes('tropic')) return 'Tropical (quente o ano todo)';
  if (k.includes('frio') || k.includes('cold')) return 'Frio (invernos rigorosos)';
  if (k.includes('temper') || k.includes('estaç') || k.includes('4 esta')) return 'Temperado (4 estações)';
  return 'Subtropical (verões quentes, invernos amenos)';
}

export function normalizeTipoCorporal(raw?: string | null): TipoCorporalType {
  const k = (raw || '').toLowerCase();
  if (k.includes('trap') || k.includes('ampul') || k.includes('hourglass') || k.includes('atlet') || k.includes('athletic') || k.includes('v-shape') || k.includes('v shape')) return 'Trapézio';
  if (k.includes('invert') || k.includes('triangulo invert')) return 'Triângulo Invertido';
  if (k.includes('triang') || k.includes('pera') || k.includes('pear')) return 'Triângulo';
  if (k.includes('oval') || k.includes('redond') || k.includes('maçã') || k.includes('apple')) return 'Oval';
  return 'Retângulo';
}

export function normalizeCaimento(raw?: string | null): CaimentoType {
  const k = (raw || '').toLowerCase();
  if (k.includes('over')) return 'Oversized';
  if (k.includes('folg') || k.includes('relaxed') || k.includes('largo')) return 'Folgado';
  if (k.includes('reto') || k.includes('straight') || k.includes('regular')) return 'Reto';
  if (k.includes('bem ajust') || k.includes('justo') || k.includes('fitted')) return 'Bem ajustado';
  return 'Levemente ajustado';
}

export function normalizeFormalidade(raw?: string | null): FormalidadeType {
  const k = (raw || '').toLowerCase();
  if (k.includes('black tie')) return 'Black Tie';
  if (k.includes('formal')) return 'Formal';
  if (k.includes('business')) return 'Business Casual';
  if (k.includes('smart')) return 'Smart Casual';
  return 'Casual';
}

export function normalizeTomDePele(raw?: string | null): TomDePeleType {
  const k = (raw || '').toLowerCase();
  if (k.includes('muito_escuro') || k.includes('muito escuro') || k.includes('very dark')) return 'Muito Escuro';
  if (k.includes('escuro') || k.includes('dark') || k.includes('moren')) return 'Escuro';
  if (k.includes('med') || k.includes('méd')) return 'Médio';
  if (k.includes('muito_claro') || k.includes('muito claro') || k.includes('very fair')) return 'Muito Claro';
  return 'Claro';
}

export function normalizeEstilo(raw?: string | null): EstiloType {
  const k = (raw || '').toLowerCase();
  if (k.includes('clás') || k.includes('clas') || k.includes('atempor') || k.includes('classic')) return 'Clássico e atemporal';
  if (k.includes('român') || k.includes('roman') || k.includes('delicad')) return 'Romântico e delicado';
  if (k.includes('minim') || k.includes('modern')) return 'Moderno e minimalista';
  if (k.includes('ousad') || k.includes('marcant') || k.includes('bold')) return 'Ousado e marcante';
  if (k.includes('boho') || k.includes('despoj') || k.includes('bohemian')) return 'Boho e despojado';
  return 'Elegante e sofisticado';
}