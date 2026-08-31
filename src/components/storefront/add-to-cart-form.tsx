"use client";

import { addToCartAction } from "@/server/actions";
import { useTranslations } from "next-intl";
import { emitToast } from "@/components/storefront/store-toast";

export function AddToCartForm({
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
        await addToCartAction(formData);
        emitToast(t("added"));
      }}
    >
      {children}
    </form>
  );
}
