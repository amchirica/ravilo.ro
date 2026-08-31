"use client";

import { submitReviewAction } from "@/server/actions";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ReviewForm({ productId }: { productId?: string }) {
  const t = useTranslations("review");
  const [done, setDone] = useState(false);
  if (done) return <p className="mt-4 text-sm text-mute">{t("pending")}</p>;
  return (
    <form
      className="mt-6 grid max-w-lg gap-3"
      action={async (formData) => {
        await submitReviewAction(formData);
        setDone(true);
      }}
    >
      {productId ? <input type="hidden" name="productId" value={productId} /> : <input type="hidden" name="kind" value="STORE" />}
      <input type="hidden" name="kind" value={productId ? "PRODUCT" : "STORE"} />
      <Field label={t("rating")}>
        <Select name="rating" defaultValue="5">
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value}/5
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("title")}>
        <Input name="title" required />
      </Field>
      <Field label={t("body")}>
        <Input name="body" required />
      </Field>
      <Field label={t("name")}>
        <Input name="name" required />
      </Field>
      <Field label={t("email")}>
        <Input name="email" type="email" required />
      </Field>
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
