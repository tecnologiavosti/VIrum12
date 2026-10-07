import { useMemo } from 'react';

/**
 * Category-based icon mapping for clothing items.
 * Instead of fetching from external APIs, we use elegant
 * inline placeholders based on the clothing category.
 */

const categoryKeywords: [string[], string][] = [
  [['blazer', 'jaqueta', 'casaco', 'trench', 'colete', 'cardigan', 'sobretudo'], '🧥'],
  [['camisa', 'blusa', 'camiseta', 'polo', 'henley', 'suéter', 'tricot', 'moletom'], '👔'],
  [['calça', 'chino', 'jeans', 'shorts', 'bermuda'], '👖'],
  [['sapato', 'tênis', 'bota', 'mocassim', 'oxford', 'derby', 'loafer', 'chelsea'], '👞'],
  [['pasta', 'mochila', 'briefcase', 'weekender'], '💼'],
  [['cinto', 'gravata', 'lenço', 'cachecol', 'echarpe'], '👔'],
  [['relógio', 'abotoadura', 'pulseira', 'anel'], '⌚'],
  [['óculos'], '🕶️'],
];

function getCategoryEmoji(description: string): string {
  const lower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [keywords, emoji] of categoryKeywords) {
    for (const kw of keywords) {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower.includes(normalizedKw)) return emoji;
    }
  }
  return '✨';
}

export { getCategoryEmoji };

/** Single item — returns empty string (no external image) */
export function useClothingImage(_description: string | undefined): string {
  return '';
}

/** Batch version — returns empty map (no external images) */
export function useClothingImages(_descriptions: string[]): Map<string, string> {
  return useMemo(() => new Map<string, string>(), []);
}
