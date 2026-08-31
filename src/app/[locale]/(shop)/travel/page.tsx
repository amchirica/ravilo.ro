import type { Metadata } from "next";
import { CategoryLanding, categoryLandingMetadata } from "@/components/storefront/category-landing";

export function generateMetadata(): Promise<Metadata> {
  return categoryLandingMetadata("travel");
}

export default function Page() {
  return <CategoryLanding slug="travel" />;
}
