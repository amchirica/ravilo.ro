"use client";

import { useState } from "react";

export function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!text.trim()) return null;
  return (
    <button
      type="button"
      className="text-xs uppercase tracking-[0.14em] text-mute underline-offset-4 hover:text-ink hover:underline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (label.startsWith("Copy") ? "Copied" : "Copiat") : label}
    </button>
  );
}