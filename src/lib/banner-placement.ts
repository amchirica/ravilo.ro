export const BANNER_PLACEMENTS = ["homepage", "category", "cart", "global"] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

const ALIASES: Record<string, BannerPlacement> = {
  homepage: "homepage",
  home: "homepage",
  acasa: "homepage",
  "acasă": "homepage",
  category: "category",
  categories: "category",
  categorie: "category",
  categorii: "category",
  cart: "cart",
  cos: "cart",
  "coș": "cart",
  global: "global",
  all: "global",
  everywhere: "global",
};

export function normalizeBannerPlacement(value: string | null | undefined): BannerPlacement {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return ALIASES[key] ?? "homepage";
}

export function isBannerPlacement(value: string): value is BannerPlacement {
  return (BANNER_PLACEMENTS as readonly string[]).includes(value);
}
