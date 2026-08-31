import type { PublicProduct } from "@/services/catalog";
import { ProductCard } from "@/components/storefront/product-card";
import { cn } from "@/lib/cn";

export function ProductGrid({
  products,
  className,
}: {
  products: PublicProduct[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 md:gap-x-8 md:gap-y-14 lg:grid-cols-4", className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
