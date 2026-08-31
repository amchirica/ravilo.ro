"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Field } from "@/components/ui/primitives";

export function FileUploadForm({
  action,
  fields,
  accept,
  label,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  fields?: Record<string, string>;
  accept: string;
  label: string;
  submitLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid max-w-md gap-3">
      <Field label={label}>
        <input
          ref={inputRef}
          type="file"
          name="file"
          required
          accept={accept}
          className="text-sm"
        />
      </Field>
      <Button
        type="button"
        variant="line"
        disabled={pending}
        onClick={() => {
          const file = inputRef.current?.files?.[0];
          if (!file || file.size === 0) {
            setMessage("Alege un fișier.");
            return;
          }
          const formData = new FormData();
          for (const [key, value] of Object.entries(fields ?? {})) {
            formData.set(key, value);
          }
          formData.set("file", file, file.name);
          setMessage(null);
          startTransition(async () => {
            await action(formData);
          });
        }}
      >
        {pending ? "Se încarcă…" : submitLabel}
      </Button>
      {message ? <p className="text-sm text-warning">{message}</p> : null}
    </div>
  );
}
