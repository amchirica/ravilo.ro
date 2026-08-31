"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { submitReturnAction } from "@/server/return-actions";

const selectClass =
  "w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-olive";
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_PHOTOS = 6;
const MAX_BYTES = 8 * 1024 * 1024;

export function ReturnForm({
  defaults,
}: {
  defaults?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    street?: string;
    streetNumber?: string;
    city?: string;
    county?: string;
    postalCode?: string;
  };
}) {
  const t = useTranslations("returns");
  const inputRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState("WITHDRAWAL");
  const [resolution, setResolution] = useState("REFUND");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const photosRequired = useMemo(
    () => ["DEFECT", "WRONG_ITEM", "DAMAGED", "WARRANTY"].includes(reason),
    [reason],
  );

  function replaceFiles(next: File[]) {
    setPreviews((current) => {
      for (const url of current) URL.revokeObjectURL(url);
      return next.map((file) => URL.createObjectURL(file));
    });
    setFiles(next);
  }

  function addFiles(incoming: File[]) {
    const accepted: File[] = [];
    let error: string | null = null;
    for (const file of incoming) {
      if (!PHOTO_TYPES.has(file.type) && !/\.(jpe?g|png|webp|avif)$/i.test(file.name)) {
        error = t("photosType");
        continue;
      }
      if (file.size > MAX_BYTES) {
        error = t("photosTooBig");
        continue;
      }
      accepted.push(file);
    }
    const next = [...files, ...accepted].slice(0, MAX_PHOTOS);
    replaceFiles(next);
    setLocalError(error);
  }

  return (
    <form
      className="mt-10 grid gap-8 border border-line bg-card p-6 md:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.delete("photos");
        for (const file of files) formData.append("photos", file, file.name);
        if (photosRequired && files.length === 0) {
          setLocalError(t("photosRequired"));
          return;
        }
        setLocalError(null);
        startTransition(async () => {
          await submitReturnAction(formData);
        });
      }}
    >
      <Section n="01" title={t("sectionContact")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("firstName")}>
            <Input name="firstName" required autoComplete="given-name" defaultValue={defaults?.firstName} />
          </Field>
          <Field label={t("lastName")}>
            <Input name="lastName" required autoComplete="family-name" defaultValue={defaults?.lastName} />
          </Field>
          <Field label={t("email")}>
            <Input name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} />
          </Field>
          <Field label={t("phone")}>
            <Input name="phone" type="tel" required autoComplete="tel" defaultValue={defaults?.phone} />
          </Field>
        </div>
      </Section>

      <Section n="02" title={t("sectionOrder")}>
        <Field label={t("orderNumber")}>
          <Input name="orderNumber" required placeholder="RVL-1001" autoComplete="off" />
        </Field>
        <p className="text-xs text-mute">{t("orderNumberHint")}</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("product")}>
            <Input name="productName" />
          </Field>
          <Field label={t("sku")}>
            <Input name="sku" />
          </Field>
          <Field label={t("quantity")}>
            <Input name="quantity" type="number" min={1} max={20} defaultValue={1} required />
          </Field>
        </div>
      </Section>

      <Section n="03" title={t("sectionReason")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("reason")}>
            <select name="reason" className={selectClass} value={reason} onChange={(event) => setReason(event.target.value)} required>
              <option value="WITHDRAWAL">{t("reasonWithdrawal")}</option>
              <option value="DEFECT">{t("reasonDefect")}</option>
              <option value="WRONG_ITEM">{t("reasonWrong")}</option>
              <option value="DAMAGED">{t("reasonDamaged")}</option>
              <option value="WARRANTY">{t("reasonWarranty")}</option>
              <option value="OTHER">{t("reasonOther")}</option>
            </select>
          </Field>
          <Field label={t("resolution")}>
            <select
              name="resolution"
              className={selectClass}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              required
            >
              <option value="REFUND">{t("resolutionRefund")}</option>
              <option value="EXCHANGE">{t("resolutionExchange")}</option>
              <option value="STORE_CREDIT">{t("resolutionCredit")}</option>
              <option value="REPAIR">{t("resolutionRepair")}</option>
            </select>
          </Field>
          <Field label={t("opened")}>
            <select name="packageOpened" className={selectClass} defaultValue="yes">
              <option value="yes">{t("yes")}</option>
              <option value="no">{t("no")}</option>
            </select>
          </Field>
          <Field label={t("unused")}>
            <select name="unused" className={selectClass} defaultValue="no">
              <option value="yes">{t("yes")}</option>
              <option value="no">{t("no")}</option>
            </select>
          </Field>
        </div>
        <Field label={t("description")}>
          <Textarea name="description" rows={6} required minLength={12} placeholder={t("descriptionHint")} />
        </Field>
      </Section>

      <Section n="04" title={t("sectionAddress")}>
        <p className="text-xs text-mute">{t("addressHint")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("county")}>
            <Input name="county" required autoComplete="address-level1" defaultValue={defaults?.county} />
          </Field>
          <Field label={t("city")}>
            <Input name="city" required autoComplete="address-level2" defaultValue={defaults?.city} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("street")}>
            <Input name="street" required autoComplete="street-address" defaultValue={defaults?.street} />
          </Field>
          <Field label={t("streetNumber")}>
            <Input name="streetNumber" required defaultValue={defaults?.streetNumber} />
          </Field>
          <Field label={t("postalCode")}>
            <Input name="postalCode" required autoComplete="postal-code" defaultValue={defaults?.postalCode} />
          </Field>
        </div>
        <Field label={t("method")}>
          <select name="returnMethod" className={selectClass} defaultValue="CUSTOMER_SHIP">
            <option value="CUSTOMER_SHIP">{t("methodShip")}</option>
            <option value="COURIER_PICKUP">{t("methodPickup")}</option>
          </select>
        </Field>
        <p className="text-xs text-mute">{t("pickupNote")}</p>
      </Section>

      {resolution === "REFUND" ? (
        <Section n="05" title={t("sectionRefund")}>
          <Field label={t("ibanHolder")}>
            <Input name="ibanHolder" required autoComplete="name" />
          </Field>
          <Field label={t("iban")}>
            <Input name="iban" required placeholder="RO49AAAA1B31007593840000" autoComplete="off" />
          </Field>
          <p className="text-xs text-mute">{t("ibanHint")}</p>
        </Section>
      ) : null}

      <Section n={resolution === "REFUND" ? "06" : "05"} title={t("sectionPhotos")}>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(Array.from(event.dataTransfer.files));
          }}
          className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-mute hover:border-olive"
        >
          <span className="font-medium text-ink">{t("dropTitle")}</span>
          <span>{photosRequired ? t("photosRequired") : t("photosHint")}</span>
        </button>
        {previews.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {previews.map((src, index) => (
              <li key={src} className="relative aspect-square overflow-hidden border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-ink px-2 py-0.5 text-[10px] text-paper"
                  onClick={() => replaceFiles(files.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section n={resolution === "REFUND" ? "07" : "06"} title={t("sectionConfirm")}>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required className="mt-1" />
          <span>{t("consent")}</span>
        </label>
        <div className="hidden" aria-hidden>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {localError ? <p className="text-sm text-warning">{localError}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("send")}
        </Button>
      </Section>
    </form>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline gap-3 font-display text-2xl">
        <span className="text-xs uppercase tracking-[0.18em] text-olive">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
