import { getTranslations } from "next-intl/server";

export async function AdminHeading({
  k,
  children,
}: {
  k: string;
  children?: React.ReactNode;
}) {
  const t = await getTranslations("admin");
  const label = t(k as "products");
  if (!children) return <h1 className="text-2xl tracking-[-0.03em]">{label}</h1>;
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl tracking-[-0.03em]">{label}</h1>
      {children}
    </div>
  );
}
