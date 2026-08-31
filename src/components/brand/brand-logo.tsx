import NextLink from "next/link";
import { Link as LocaleLink } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export const BRAND_LOGO_SRC = "/ravilo.png";
export const BRAND_FAVICON_SRC = "/favicon.ico";
export const BRAND_LOGO_SIZE = { width: 868, height: 294 };

export function BrandLogo({
  href = "/",
  className,
  height = 36,
  priority = false,
  invert = "dark",
}: {
  href?: string;
  className?: string;
  height?: number;
  priority?: boolean;
  invert?: boolean | "dark";
}) {
  const width = Math.round((BRAND_LOGO_SIZE.width / BRAND_LOGO_SIZE.height) * height);
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="RAVILO"
      width={width}
      height={height}
      className={cn(
        "max-h-full max-w-full w-auto object-contain object-left",
        invert === true && "invert",
        invert === "dark" && "dark:invert",
      )}
      style={{ height }}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
  const classes = cn("inline-flex min-w-0 items-center", className);
  if (href.startsWith("/admin")) {
    return (
      <NextLink href={href} prefetch={false} className={classes} aria-label="RAVILO">
        {image}
      </NextLink>
    );
  }
  return (
    <LocaleLink href={href} prefetch={false} className={classes} aria-label="RAVILO">
      {image}
    </LocaleLink>
  );
}
