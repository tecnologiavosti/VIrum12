// VIRUM — Centralized Prompt Builder
// Single source of truth for all FLUX/HF image generation prompts across the diagnosis result.
// Every tab (resumo, estilo, modelagens, essenciais, capsula, guarda-roupa) MUST go through
// `generateImagePrompt(diagnostic, imageType, extras?)` so the visual identity is consistent:
// same man, same lighting, same editorial standard (Hugo Boss / Ralph Lauren / Brunello Cucinelli).

import type { DiagnosticData } from '@/types/diagnostic';
import {
  BODY_TYPE_EN, FIT_EN, STYLE_EN, OCCASION_EN, FORMALITY_EN,
  CLIMATE_FABRIC_EN, SKIN_TONE_EN, STYLE_PALETTE, SEASON_PALETTE,
} from '@/lib/imageTranslations';

export type ImageType =
  | 'summary'
  | 'style'
  | 'modeling'
  | 'essentials'
  | 'wardrobe'
  | 'wardrobe_accessory'
  | 'color'
  | 'upper'
  | 'lower'
  | 'collars'
  | 'sleeves'
  | 'fabrics'
  | 'shoes'
  | 'fullbody';

// ─── Composition ───
// GLOBAL RULE: VIRUM images represent the recommended menswear look first.
// The model is only a fit/scale support: full outfit visibility beats identity.
// STRICT: adult male body, fully dressed, face/head never visible.
const COMPOSITION: Record<ImageType, string> = {
  summary:            'full menswear lookbook photograph, body dressed from shoulders/collarbone to shoes, head cropped fully out, outfit fills the frame',
  style:              'editorial menswear look photograph, complete outfit visible from shoulders/collarbone to shoes, head out of frame',
  modeling:           'menswear fit photograph showing dressed torso, legs and garment silhouette, head out of frame, clothing construction visible',
  essentials:         'menswear wardrobe recommendation photo, garment or outfit clearly visible, head out of frame, fabric and fit in focus',
  wardrobe:           'complete recommended menswear outfit on adult male body, shoulders/collarbone to shoes visible, head fully out, outfit occupies ≥85% of the frame',
  wardrobe_accessory: 'editorial macro of a menswear accessory worn on the body of an adult man, framed from below the neck, no head, no face',
  color:              'editorial menswear outfit in the recommended palette, dressed body from shoulders/collarbone down, head out of frame',
  upper:              'chest and torso editorial of an adult man from below the neck, upper garment centered, fully clothed, head out of frame',
  lower:              'editorial of an adult man from below the neck, lower garment and shoes centered, head out of frame',
  collars:            'collar and neckline macro on an adult man from below the neck, chin/face/hair out of frame',
  sleeves:            'sleeve and cuff macro on the arms of an adult man, framed from below the neck, no head, no face',
  fabrics:            'fabric texture macro on the torso of an adult man from below the neck, fully clothed, no head, no face',
  shoes:              'footwear-focused editorial of an adult man from below the neck, camera on the shoes with legs anchoring, no head, no face',
  fullbody:           'full outfit editorial cropped from shoulders/collarbone to shoes, head fully out of frame, clothing is the subject',
};

// Composition when a SINGLE piece is being rendered (wardrobe category cards,
// individual essentials, single-piece modal). The garment is the entire subject —
// no full outfit, no companion pieces, no styled look.
const SINGLE_PIECE_COMPOSITION: Record<string, string> = {
  top:        'single upper garment product shot, isolated on adult male torso framed from below the neck, no other visible clothing besides discreet neutral trousers if unavoidable, head out of frame',
  pants:      'single lower garment product shot, isolated on adult male legs, framed from the waist down to the shoes, plain neutral top if any, head out of frame',
  outerwear:  'single outerwear garment product shot on adult male torso, front-facing, framed from below the neck, only the outerwear is the subject, head out of frame',
  footwear:   'single pair of shoes product shot, close editorial framing on the feet and ankles, plain neutral trousers cropped at the calf, head out of frame',
  bag:        'single bag product shot held by an adult man, framed on the accessory, head out of frame',
  accessory:  'single accessory macro on the body of an adult man, framed tight on the accessory, head out of frame',
  default:    'single garment product shot on adult male body, isolated piece is the only subject, no full outfit, head out of frame',
};

function singlePieceComposition(category?: string): string {
  const key = (category || '').toLowerCase();
  if (key.includes('foot') || key.includes('shoe') || key.includes('calc')) return SINGLE_PIECE_COMPOSITION.footwear;
  if (key.includes('pant') || key.includes('trouser') || key.includes('bottom') || key.includes('calc') || key.includes('bermuda')) return SINGLE_PIECE_COMPOSITION.pants;
  if (key.includes('outer') || key.includes('jacket') || key.includes('coat') || key.includes('sobrepos') || key.includes('blazer')) return SINGLE_PIECE_COMPOSITION.outerwear;
  if (key.includes('bag') || key.includes('bolsa')) return SINGLE_PIECE_COMPOSITION.bag;
  if (key.includes('accessory') || key.includes('acess')) return SINGLE_PIECE_COMPOSITION.accessory;
  if (key.includes('top') || key.includes('shirt') || key.includes('camis') || key.includes('malha') || key.includes('knit')) return SINGLE_PIECE_COMPOSITION.top;
  return SINGLE_PIECE_COMPOSITION.default;
}

// ─── GLOBAL PROMPT PREFIX — mandatory on every image ───
const GLOBAL_PROMPT_PREFIX =
  'Generate a complete menswear recommendation image for VIRUM; the look and garments are the subject, not the person. ' +
  'Adult male body only as a fit support, fully clothed, preferably shoulders/collarbone to shoes or full body with head cropped out. ' +
  'Head, face, hair, ears, eyes, nose and mouth completely OUT of the frame above the top edge. ' +
  'No women. No children. No couples. No groups. No portrait. No selfie. No headshot. No bust. ' +
  'No shirtless. No bare torso. No underwear. No nudity. ' +
  'Editorial premium menswear fashion photography, professional studio lighting, clean minimal background, natural pose.';

// ─── Negatives, always preserved ───
const NEGATIVE_PROMPT =
  'ABSOLUTELY NO FACE, NO HEAD, NO HAIR, NO SCALP, NO EYES, NO NOSE, NO MOUTH, NO EARS, NO CHIN, NO JAW, ' +
  'no facial features, no facial expression, no portrait, no selfie, no headshot, no bust, no head silhouette, ' +
  'NO WOMAN, NO WOMEN, NO FEMALE, NO GIRL, NO CHILD, NO KID, NO COUPLE, NO GROUP, NO SECOND PERSON, ' +
  'no makeup, no long hair, no feminine body, no dress, no skirt, no high heels, no purse, ' +
  'NO SHIRTLESS, NO BARE TORSO, NO BARE CHEST, NO UNDERWEAR, NO NUDITY, no swimwear, ' +
  'no mannequin head, no doll, no cartoon, no mirror reflection of a face, no text, no logo, no watermark, ' +
  'no deformed hands, no deformed feet, no blurry, no low quality.';

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
// (pick helper removed — identity no longer randomizes facial features)

function seasonalPalette(d: DiagnosticData): string {
  if (Array.isArray(d.imageContext?.palette) && d.imageContext.palette.length) {
    return d.imageContext.palette.slice(0, 6).join(', ');
  }
  return (
    SEASON_PALETTE?.[d.tomDePele]?.[d.estiloPersonalidade] ||
    STYLE_PALETTE[d.estiloPersonalidade] ||
    'navy, charcoal, camel, ivory'
  );
}

function identityLine(d: DiagnosticData): string {
  // Adult male body only. Skin tone anchors garment reading. NEVER describe
  // face, hair, eyes or head — those are always cropped above the frame.
  const skin = (SKIN_TONE_EN[d.tomDePele] || 'neutral').toLowerCase();
  return `adult male body used only to show fit, ${skin} skin where unavoidable, fully clothed, head and hair completely out of frame above the top edge`;
}

function compactList(items: unknown[] | undefined, max = 7): string[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max);
}

function diagnosticLookLine(d: DiagnosticData): string {
  const ctx = d.imageContext;
  const lookPieces = compactList(ctx?.lookPieces?.length ? ctx.lookPieces : ctx?.recommendedPieces, 8);
  const accessories = compactList(ctx?.accessories, 3);
  const combinations = compactList(ctx?.combinations, 2);
  const pieces = lookPieces.length ? lookPieces.join(', ') : 'shirt or knit, tailored trousers, outerwear when recommended, shoes and restrained menswear accessories';
  const accessoryText = accessories.length ? `; accessories: ${accessories.join(', ')}` : '';
  const comboText = combinations.length ? `; styling combination: ${combinations.join(' / ')}` : '';
  const occasion = ctx?.occasion || OCCASION_EN[d.ocasiao] || d.ocasiao;
  const season = ctx?.season ? `; season/color analysis: ${ctx.season}` : '';
  return `complete recommended menswear look for ${occasion}: ${pieces}${accessoryText}${comboText}${season}`;
}

function clothingLine(imageType: ImageType, d: DiagnosticData, extras?: { piece?: string; color?: string }): string {
  const fit = FIT_EN[d.caimento] || 'tailored';
  const formality = FORMALITY_EN[d.formalidade] || 'smart casual';
  const fabric = (CLIMATE_FABRIC_EN[d.clima] || 'premium fabric').split(',')[0].trim();
  const body = (BODY_TYPE_EN[d.tipoCorporal] || 'athletic').split(' ')[0];

  if (imageType === 'wardrobe' || imageType === 'wardrobe_accessory' || imageType === 'essentials') {
    // SINGLE-PIECE MODE — a specific piece was provided by the wardrobe UI.
    // Do NOT inject the full look; the image must represent ONLY this garment,
    // otherwise category cards (Calçados, Camisaria, Calças, Sobreposições)
    // end up rendering a complete outfit instead of just the item.
    if (extras?.piece) {
      const piece = extras.piece.trim();
      const color = extras?.color ? ` in ${extras.color}` : '';
      return `ONLY this single garment: ${piece}${color}. No other clothing pieces beyond what is strictly required to support fit. ${fit} cut, ${fabric}, tailored for a ${body} build, garment fills the frame and is the sole subject`;
    }
    // No specific piece → fall back to the full recommended look (Guarda-Roupa
    // hero / essentials overview only, never a category card).
    const fullLook = diagnosticLookLine(d);
    return `${fullLook}, ${fit} fit for a ${body} build, ${fabric}, garments clearly visible from shoulders/collarbone to shoes`;
  }
  const fullLook = diagnosticLookLine(d);
  if (imageType === 'color') return `${fullLook}, colors strictly from the recommended palette, ${fit} fit, ${fabric}`;
  return `${fullLook}, ${formality} styling, ${fit} ${fabric}, flattering a ${body} build`;
}

/**
 * Order: composition → identity → clothing → style → palette → quality → negatives.
 * Each piece of info appears once. Target ≤700 chars.
 */
export function generateImagePrompt(
  diagnostic: DiagnosticData,
  imageType: ImageType,
  extras?: { piece?: string; color?: string; category?: string },
): string {
  const isSinglePiece =
    !!extras?.piece &&
    (imageType === 'wardrobe' || imageType === 'wardrobe_accessory' || imageType === 'essentials');
  const composition = isSinglePiece
    ? singlePieceComposition(extras?.category)
    : (COMPOSITION[imageType] || COMPOSITION.fullbody);
  const identity = identityLine(diagnostic);
  const clothing = clothingLine(imageType, diagnostic, extras);
  const style = diagnostic.imageContext?.style || STYLE_EN[diagnostic.estiloPersonalidade] || 'modern classic';
  const palette = seasonalPalette(diagnostic).split(',').slice(0, 3).map((c) => c.trim()).join(', ');

  const clothingLead = clothing.length > 400 ? clothing.slice(0, 400) : clothing;
  // Single-piece cards must NOT frame the prompt as "diagnosis-based look" —
  // that phrasing pulls the model back into rendering a complete outfit.
  const leadPrefix = isSinglePiece
    ? `Editorial menswear product photograph of a SINGLE garment only: ${clothingLead}`
    : `Editorial menswear photograph of the diagnosis-based look: ${clothingLead}`;
  const head = [
    GLOBAL_PROMPT_PREFIX,
    leadPrefix,
    composition,
    identity,
    `${style} menswear aesthetic`,
    `palette ${palette}`,
    'photorealistic, soft studio light, 85mm, high detail on fabric, seams and stitching',
  ].join('. ').replace(/\s+/g, ' ').trim();

  // Hard limit keeps providers stable, but must leave enough room for the
  // diagnosis pieces/look context. Do not let negative locks crowd out clothes.
  // Reserve room for `. ${NEGATIVE_PROMPT}` at the tail, and trim only the head.
  const HARD_LIMIT = 1800;
  const tail = `. ${NEGATIVE_PROMPT}`;
  const prefix = `${NEGATIVE_PROMPT} `;
  const budgetForHead = HARD_LIMIT - prefix.length - tail.length;
  const safeHead = head.length > budgetForHead ? head.slice(0, Math.max(0, budgetForHead)) : head;
  const prompt = `${prefix}${safeHead}${tail}`;
  // Verbose log only in dev — keeps production console clean.
  if (import.meta.env?.DEV) {
    console.log(`[promptBuilder] ${imageType} (${prompt.length}c) → ${prompt}`);
  }
  return prompt;
}

/** Deterministic seed — same diagnostic + section always yields the same composition. */
export function identitySeed(diagnostic: DiagnosticData, imageType: ImageType): number {
  const base = hashString(`${diagnostic.userId}|${diagnostic.tomDePele}|${diagnostic.corCabelo}|${diagnostic.corOlhos}|${diagnostic.tipoCorporal}`);
  return (base ^ hashString(imageType)) % 2147483647;
}

export function sectionToImageType(section: string): ImageType {
  switch (section) {
    case 'resumo': return 'summary';
    case 'estilo': return 'style';
    case 'modelagens':
    case 'corpo': return 'modeling';
    case 'essenciais': return 'essentials';
    case 'cores': return 'color';
    case 'capsula': return 'wardrobe';
    default: return 'summary';
  }
}