import type { Metadata } from "next";
import { CategoryLanding, categoryLandingMetadata } from "@/components/storefront/category-landing";

export function generateMetadata(): Promise<Metadata> {
  return categoryLandingMetadata("auto");
}

export default function Page() {
  return <CategoryLanding slug="auto" />;
}
