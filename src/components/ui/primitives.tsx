import NextLink from "next/link";
import { Link as LocaleLink } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const buttonVariants = {
  solid: "bg-ink text-paper hover:bg-olive-dark",
  primary: "bg-ink text-paper hover:bg-olive-dark",
  line: "border border-line bg-transparent text-ink hover:border-ink hover:bg-surface",
  secondary: "bg-cream text-ink hover:bg-cream-hover",
  ghost: "border border-line bg-transparent text-ink hover:bg-surface",
  text: "bg-transparent px-0 text-ink underline-offset-4 hover:underline",
  danger: "bg-danger text-paper hover:opacity-90",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  href,
  children,
  variant = "solid",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: ButtonVariant;
}) {
  const styles = cn(
    "inline-flex h-12 items-center justify-center rounded-md px-6 text-sm font-medium tracking-[-0.01em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40",
    buttonVariants[variant],
    className,
  );
  if (href) {
    const adminOrExternal =
      href.startsWith("http") || href.startsWith("/admin") || href.startsWith("/api") || href.startsWith("mailto:");
    if (adminOrExternal) {
      return (
        <NextLink href={href} prefetch={false} className={styles}>
          {children}
        </NextLink>
      );
    }
    return (
      <LocaleLink href={href} prefetch={false} className={styles}>
        {children}
      </LocaleLink>
    );
  }
  return (
    <button className={styles} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center text-ink/80 transition-colors duration-200 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.8125rem] text-mute">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  "h-12 w-full rounded-md border border-line bg-card px-3.5 text-sm outline-none transition-colors duration-200 placeholder:text-mute/70 focus:border-ink";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, "h-auto min-h-28 py-3", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cn("py-16 md:py-24 lg:py-28", className)}>{children}</section>;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-14", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className={cn("font-display text-[2rem] leading-[1.1] tracking-[-0.03em] md:text-4xl", eyebrow && "mt-3")}>
          {title}
        </h2>
        {subtitle ? <p className="mt-3 max-w-xl text-mute">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  description,
  kicker,
  meta,
  className,
}: {
  title: string;
  description?: string;
  kicker?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-10 md:mb-14", className)}>
      {kicker}
      <h1 className={cn("font-display text-[2.5rem] leading-[1.08] tracking-[-0.04em] md:text-5xl", kicker && "mt-3")}>
        {title}
      </h1>
      {description ? <p className="mt-4 max-w-2xl text-mute">{description}</p> : null}
      {meta ? <div className="mt-3 text-sm text-mute">{meta}</div> : null}
    </header>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <LocaleLink
      href={href}
      prefetch={false}
      className={cn(
        "text-[0.6875rem] uppercase tracking-[0.16em] text-mute transition-colors duration-200 hover:text-ink",
        className,
      )}
    >
      {children}
    </LocaleLink>
  );
}

export function Accordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <details className="group border-t border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 text-sm tracking-[-0.01em]">
        {title}
        <span className="text-mute transition-transform duration-200 group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-mute">{children}</div>
    </details>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.6875rem] uppercase tracking-[0.14em] text-mute">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <LocaleLink href={item.href} prefetch={false} className="hover:text-ink">
                {item.label}
              </LocaleLink>
            ) : (
              <span className="text-ink/70">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
