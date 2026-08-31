import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";

export function EmptyState({
  title,
  hint,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-md py-16", className)}>
      <p className="font-display text-3xl tracking-[-0.03em]">{title}</p>
      {hint ? <p className="mt-4 text-mute">{hint}</p> : null}
      {actionHref && actionLabel ? (
        <Button href={actionHref} className="mt-8">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="aspect-[4/5] bg-surface" />
          <div className="mt-4 h-3 w-1/3 bg-surface" />
          <div className="mt-2 h-4 w-2/3 bg-surface" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mt-8 space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-12 bg-surface" />
      ))}
    </div>
  );
}
