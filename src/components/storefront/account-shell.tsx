import { Link } from "@/i18n/routing";
import { Container } from "@/components/ui/primitives";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/cont", key: "orders" as const },
  { href: "/cont/adrese", key: "addresses" as const },
  { href: "/cont/wishlist", key: "wishlist" as const },
  { href: "/cont/profil", key: "profile" as const },
  { href: "/cont/date", key: "privacy" as const },
];

export async function AccountShell({
  title,
  description,
  current,
  children,
  actions,
}: {
  title: string;
  description?: string;
  current: (typeof LINKS)[number]["key"];
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const t = await getTranslations("account");
  return (
    <Container className="py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.5rem] leading-[1.08] tracking-[-0.04em] md:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-xl text-mute">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-10 grid gap-10 md:grid-cols-[200px_minmax(0,1fr)] md:gap-14">
        <nav className="-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 pb-3 md:mx-0 md:flex-col md:gap-3 md:overflow-visible md:border-b-0 md:px-0 md:pb-0">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 text-sm tracking-[-0.01em] transition-colors duration-200",
                current === item.key ? "text-ink" : "text-mute hover:text-ink",
              )}
              aria-current={current === item.key ? "page" : undefined}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
