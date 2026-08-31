"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/server/auth/session";
import { ReturnRequestError, submitReturnRequest } from "@/services/returns";
import { z } from "zod";
import type { AppLocale } from "@/i18n/routing";

export async function submitReturnAction(formData: FormData) {
  const locale = (await getLocale()) as AppLocale;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const user = await getCurrentUser();
  try {
    const result = await submitReturnRequest(formData, { ip, profileId: user?.id });
    if (result.ignored) return;
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirect({ href: "/retur?e=validation", locale });
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("IBAN")) redirect({ href: "/retur?e=iban", locale });
    if (message.includes("poză") || message.includes("photo")) redirect({ href: "/retur?e=photos", locale });
    if (message.includes("Prea multe")) redirect({ href: "/retur?e=rate", locale });
    if (error instanceof ReturnRequestError) redirect({ href: "/retur?e=fail", locale });
    redirect({ href: "/retur?e=fail", locale });
  }
  redirect({ href: "/retur?sent=1", locale });
}
