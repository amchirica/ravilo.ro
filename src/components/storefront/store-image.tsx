import Image from "next/image";

function isNextImageSrc(src: string) {
  return src.startsWith("/") || src.startsWith("https://") || src.startsWith("http://");
}

export function StoreImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src || !isNextImageSrc(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src || undefined} alt={alt} className={className} />;
  }
  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes ?? "100vw"} className={className} priority={priority} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 1000}
      sizes={sizes}
      className={className}
      priority={priority}
    />
  );
}
