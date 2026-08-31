import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const locales = ["ro", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ro",
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: {
    name: "RAVILO_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
