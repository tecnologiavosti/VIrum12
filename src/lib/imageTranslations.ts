// VIRUM — PT → EN translations for image prompt generation.

export const BODY_TYPE_EN: Record<string, string> = {
  "Trapézio": "athletic trapezoid male (broad shoulders, defined waist, V-shape)",
  "Triângulo Invertido": "inverted-triangle male (very broad shoulders, narrow waist)",
  "Retângulo": "rectangle male (shoulders aligned with waist, straight torso)",
  "Triângulo": "triangle male (narrow shoulders, wider hips)",
  "Oval": "oval male (fuller midsection, soft torso)",
};

export const FIT_EN: Record<string, string> = {
  "Bem ajustado": "fitted",
  "Levemente ajustado": "slightly fitted",
  "Reto": "straight",
  "Folgado": "relaxed",
  "Oversized": "oversized",
};

export const FORMALITY_EN: Record<string, string> = {
  "Casual": "casual",
  "Smart Casual": "smart casual",
  "Business Casual": "business casual",
  "Formal": "formal",
  "Black Tie": "black tie",
};

// Maps PT-BR skin tone to the closest editorial color season — shared by
// every image hook so the seasonal palette is consistent across the app.
export const SEASON_FOR_TONE: Record<string, string> = {
  "Muito Claro": "soft summer",
  "Claro": "light spring",
  "Médio": "warm autumn",
  "Escuro": "deep autumn",
  "Muito Escuro": "deep winter",
};

export const CLIMATE_FABRIC_EN: Record<string, string> = {
  "Tropical (quente o ano todo)": "linen, light viscose, cotton voile, breathable fabrics",
  "Subtropical (verões quentes, invernos amenos)": "cotton, light wool, ponte, modal",
  "Temperado (4 estações)": "wool blend, silk, denim, structured cotton",
  "Frio (invernos rigorosos)": "cashmere, heavy wool, tweed, velvet, bouclé",
};

export const SKIN_TONE_EN: Record<string, string> = {
  "Muito Claro": "very fair",
  "Claro": "fair",
  "Médio": "medium",
  "Escuro": "dark",
  "Muito Escuro": "very dark",
};

export const STYLE_EN: Record<string, string> = {
  "Clássico e atemporal": "classic timeless",
  "Romântico e delicado": "romantic delicate",
  "Moderno e minimalista": "modern minimalist",
  "Ousado e marcante": "bold statement",
  "Boho e despojado": "bohemian relaxed",
  "Elegante e sofisticado": "elegant sophisticated",
};

export const OCCASION_EN: Record<string, string> = {
  "Trabalho/Escritório": "office work",
  "Casual/Dia a dia": "casual everyday",
  "Eventos sociais": "social events",
  "Ocasiões formais": "formal occasions",
  "Esportes/Academia": "sports gym",
  "Viagens": "travel",
};

export const STYLE_PALETTE: Record<string, string> = {
  "Clássico e atemporal": "ivory, camel, navy, cognac, charcoal grey",
  "Romântico e delicado": "blush rose, dusty mauve, champagne, powder blue, ivory",
  "Moderno e minimalista": "off-white, stone grey, black, ecru, warm white",
  "Ousado e marcante": "cobalt, burnt orange, deep red, emerald, mustard",
  "Boho e despojado": "terracotta, rust, olive green, warm sand, indigo",
  "Elegante e sofisticado": "burgundy, champagne, deep navy, taupe, gold",
};

export const STYLE_PROPS: Record<string, string> = {
  "Clássico e atemporal": "leather briefcase, silk tie, gold dress watch, oxford shoes",
  "Romântico e delicado": "linen pocket square, knit tie, suede derby shoes, soft cotton scarf",
  "Moderno e minimalista": "architectural leather backpack, minimal steel watch, white leather sneakers",
  "Ousado e marcante": "statement leather belt, bold patterned tie, suede chelsea boots, signet ring",
  "Boho e despojado": "woven leather tote, beaded bracelet, suede desert boots, linen shirt",
  "Elegante e sofisticado": "leather document case, fine cufflinks, dress oxfords, cashmere overcoat",
};

export const BODY_MODELAGEM: Record<string, string> = {
  "Trapézio": "slim-fit tailored suit, fitted dress shirt, tapered trousers, structured blazer that follows the V-shape",
  "Triângulo Invertido": "straight-leg trousers, wide-leg chinos, relaxed shoulder blazer, single-breasted suit",
  "Triângulo": "structured shoulder blazer, double-breasted suit jacket, tailored overcoat",
  "Retângulo": "double-breasted blazer, layered knitwear, belted trench coat, textured suit",
  "Oval": "single-breasted tailored suit, vertical pinstripe blazer, straight-leg trousers, long overcoat",
};

export const OCCASION_OUTFIT: Record<string, string> = {
  "Trabalho/Escritório": "tailored two-piece suit, dress shirt, silk tie, leather oxfords, briefcase, office setting",
  "Casual/Dia a dia": "selvedge jeans, premium t-shirt, leather sneakers, leather strap watch, urban street",
  "Eventos sociais": "slim tailored suit, knit polo or dress shirt, leather loafers, cocktail setting",
  "Ocasiões formais": "black tie tuxedo or sharp three-piece suit, patent oxfords, formal venue",
  "Esportes/Academia": "technical training shorts, performance t-shirt, athletic sneakers, gym bag, studio",
  "Viagens": "tailored chinos, merino crewneck, suede sneakers, weekender bag, airport terminal",
};

export const SEASON_PALETTE: Record<string, Record<string, string>> = {
  "Muito Claro": {
    "Clássico e atemporal":    "soft white, pale blush, light grey, silver",
    "Romântico e delicado":    "powder pink, lavender, pale peach, ivory",
    "Moderno e minimalista":   "pure white, light stone, silver, pale grey",
    "Ousado e marcante":       "coral, sky blue, warm red, bright gold",
    "Boho e despojado":        "warm ivory, light terracotta, dusty rose, sand",
    "Elegante e sofisticado":  "champagne, pearl, platinum, rose gold",
  },
  "Claro": {
    "Clássico e atemporal":    "ivory, camel, warm grey, blush",
    "Romântico e delicado":    "dusty rose, powder blue, warm peach, mauve",
    "Moderno e minimalista":   "ecru, warm white, light taupe, blush",
    "Ousado e marcante":       "cobalt blue, tomato red, bright coral, turquoise",
    "Boho e despojado":        "burnt sienna, warm olive, dusty rose, wheat",
    "Elegante e sofisticado":  "rose gold, soft champagne, warm blush, light bronze",
  },
  "Médio": {
    "Clássico e atemporal":    "camel, burgundy, navy, warm tan",
    "Romântico e delicado":    "dusty mauve, warm coral, terracotta rose, orchid",
    "Moderno e minimalista":   "warm stone, terracotta, dusty olive, cafe au lait",
    "Ousado e marcante":       "cobalt, mustard, burnt orange, rich teal",
    "Boho e despojado":        "rust, warm terracotta, olive, rich cream",
    "Elegante e sofisticado":  "burgundy, champagne, deep olive, warm bronze",
  },
  "Escuro": {
    "Clássico e atemporal":    "deep navy, chocolate brown, warm black, rich camel",
    "Romântico e delicado":    "deep plum, rich rose, warm burgundy, copper",
    "Moderno e minimalista":   "charcoal, warm black, deep taupe, rich brown",
    "Ousado e marcante":       "bold orange, emerald, gold, hot pink",
    "Boho e despojado":        "deep rust, rich olive, ochre, warm brown",
    "Elegante e sofisticado":  "deep burgundy, gold, rich emerald, warm black",
  },
  "Muito Escuro": {
    "Clássico e atemporal":    "pure white, cream, warm ivory, rich camel",
    "Romântico e delicado":    "bright coral, fuchsia, warm white, gold",
    "Moderno e minimalista":   "pure white, bright ecru, crisp black, bold red",
    "Ousado e marcante":       "neon orange, bright gold, vivid pink, electric blue",
    "Boho e despojado":        "bright terracotta, warm white, bold orange, gold",
    "Elegante e sofisticado":  "pure white, bright gold, rich jewel tones, champagne",
  },
};
