import { redirect } from "next/navigation";

export default async function LegacyCategoryRedirect({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  redirect(locale === "en" ? `/en/categorie/${slug}` : `/categorie/${slug}`);
}
