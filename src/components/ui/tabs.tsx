"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function Tabs({
  tabs,
}: {
  tabs: { id: string; label: string; children: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "px-3 py-2 text-xs uppercase tracking-[0.16em]",
              tab.id === current?.id ? "border-b-2 border-olive text-ink" : "text-mute hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {tabs.map((tab) => (
          <div key={tab.id} className={tab.id === current?.id ? "block" : "hidden"} aria-hidden={tab.id !== current?.id}>
            {tab.children}
          </div>
        ))}
      </div>
    </div>
  );
}
