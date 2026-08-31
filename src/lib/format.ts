import { intlLocale, type AppLocale } from "@/lib/i18n";
import { formatRon } from "@/lib/money";

export function formatMoney(bani: number, locale: AppLocale): string {
  return formatRon(bani, intlLocale(locale));
}

export function formatDate(value: Date | string | null | undefined, locale: AppLocale): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(date);
}
