import { StoreImage } from "@/components/storefront/store-image";

type GalleryMedia = {
  id: string;
  type: string;
  storagePath: string;
  alt?: string | null;
  posterImage?: string | null;
};

export function ProductGallery({
  media,
  productName,
}: {
  media: GalleryMedia[];
  productName: string;
}) {
  if (!media.length) {
    return <div className="aspect-[4/5] bg-surface" />;
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:gap-3 sm:overflow-visible sm:px-0">
      {media.map((item, index) => (
        <div
          key={item.id}
          className="relative w-[min(88vw,28rem)] shrink-0 snap-center overflow-hidden bg-surface sm:w-auto sm:shrink"
        >
          {item.type === "VIDEO" ? (
            <video className="product-photo w-full" controls poster={item.posterImage ?? undefined} preload="metadata">
              <source src={item.storagePath} />
            </video>
          ) : (
            <div className="relative aspect-[4/5]">
              <StoreImage
                src={item.storagePath}
                alt={item.alt || productName}
                fill
                sizes="(max-width: 1024px) 100vw, 62vw"
                className="product-photo object-cover"
                priority={index === 0}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
