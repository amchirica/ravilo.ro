import { Link } from "@/i18n/routing";
import { StoreImage } from "@/components/storefront/store-image";
import { cn } from "@/lib/cn";

export function CategoryTile({
  href,
  name,
  image,
  className,
}: {
  href: string;
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <Link prefetch={false} href={href} className={cn("group block", className)}>
      <div className="relative aspect-square overflow-hidden bg-surface">
        {image ? (
          <StoreImage
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : null}
      </div>
      <span className="mt-4 block text-lg tracking-[-0.03em] transition-colors duration-200 group-hover:text-mute">{name}</span>
    </Link>
  );
}
