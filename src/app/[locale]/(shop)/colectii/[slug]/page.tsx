import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

export default async function LegacyCollectionRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  redirect({ href: `/colectie/${slug}`, locale });
}
