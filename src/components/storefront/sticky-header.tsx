"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function StickyHeader({
  children,
  announcement,
}: {
  children: React.ReactNode;
  announcement?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className="sticky top-0 z-40">
      {announcement}
      <div
        className={cn(
          "border-b transition-colors duration-200",
          scrolled ? "border-line bg-paper" : "border-transparent bg-paper/75 backdrop-blur-md",
        )}
      >
        {children}
      </div>
    </header>
  );
}
