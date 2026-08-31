"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/primitives";

export function CheckoutSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="mt-8 w-full" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
