import { Container } from "@/components/ui/primitives";
import { ProductGridSkeleton } from "@/components/storefront/empty-state";

export default function ShopLoading() {
  return (
    <Container className="py-16">
      <div className="mb-10 h-10 w-48 bg-surface" />
      <ProductGridSkeleton />
    </Container>
  );
}
