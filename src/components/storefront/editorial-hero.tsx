import { Container, Button } from "@/components/ui/primitives";
import { StoreImage } from "@/components/storefront/store-image";
import { cn } from "@/lib/cn";

export function EditorialHero({
  crumbs,
  title,
  description,
  meta,
  image,
  imageAlt,
  cta,
}: {
  crumbs?: React.ReactNode;
  title: string;
  description?: string | null;
  meta?: React.ReactNode;
  image?: string | null;
  imageAlt?: string;
  cta?: { href: string; label: string } | null;
}) {
  const hasImage = Boolean(image);
  return (
    <section>
      <Container
        className={
          hasImage
            ? "grid items-end gap-8 py-10 md:grid-cols-12 md:gap-12 md:py-16 lg:py-20"
            : "max-w-3xl py-10 md:py-16"
        }
      >
        <div className={hasImage ? "md:col-span-5" : undefined}>
          {crumbs}
          <h1 className={cn(crumbs ? "mt-3" : null, "font-display text-[clamp(2.2rem,4.5vw,4rem)] leading-[0.98] tracking-[-0.04em]")}>{title}</h1>
          {meta}
          {description ? <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-mute">{description}</p> : null}
          {cta?.href ? (
            <Button href={cta.href} className={hasImage ? "mt-8 hidden md:inline-flex" : "mt-8"}>
              {cta.label}
            </Button>
          ) : null}
        </div>
        {hasImage ? (
          <div className="relative aspect-[4/5] overflow-hidden md:col-span-7 md:aspect-[5/4]">
            <StoreImage
              src={image as string}
              alt={imageAlt || title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 58vw"
              priority
            />
          </div>
        ) : null}
        {cta?.href && hasImage ? (
          <div className="md:hidden">
            <Button href={cta.href}>{cta.label}</Button>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
