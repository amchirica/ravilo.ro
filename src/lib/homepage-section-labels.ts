import type { HomepageSectionType } from "@/types/domain";

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionType, string> = {
  HERO: "Hero (titlu mare de început)",
  CATEGORY_GRID: "Categorii",
  FEATURED_PRODUCTS: "Produse evidențiate",
  COLLECTION: "Colecții",
  RAVILO_PICKS: "RAVILO Picks",
  SHOP_BY_PROBLEM: "Rezolvă o problemă",
  BUNDLE: "Pachet evidențiat",
  EDITORIAL: "Text editorial",
  NEW_ARRIVALS: "Noutăți",
  BESTSELLERS: "Best Sellers",
  TRUST: "Motive de încredere",
  JOURNAL: "Jurnal",
  NEWSLETTER: "Newsletter",
  CUSTOM_BANNER: "Banner personalizat",
  WHY_RAVILO: "De ce RAVILO",
  REVIEWS: "Recenzii",
  GUIDES: "Ghiduri",
};

export function homepageSectionLabel(type: string): string {
  return HOMEPAGE_SECTION_LABELS[type as HomepageSectionType] ?? type;
}
