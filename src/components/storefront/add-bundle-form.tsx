"use client";

import { addBundleToCartAction } from "@/server/actions";
import { useTranslations } from "next-intl";
import { emitToast } from "@/components/storefront/store-toast";

export function AddBundleForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("cart");
  return (
    <form
      className={className}
      action={async (formData) => {
        await addBundleToCartAction(formData);
        emitToast(t("bundleAdded"));
      }}
    >
      {children}
    </form>
  );
}
