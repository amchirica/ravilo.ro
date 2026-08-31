"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";

type NavItem = { id: string; url: string; label: string };
type Category = { id: string; slug: string; name: string };

export function HeaderNav({
  items,
  categories,
  productsLabel,
}: {
  items: NavItem[];
  categories: Category[];
  productsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const showMega = categories.length >= 3;
  return (
    <nav className="hidden items-center gap-8 lg:flex" aria-label={productsLabel}>
      {items.map((item) => {
        const isProducts = item.url === "/produse";
        if (isProducts && showMega) {
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <Link prefetch={false} href="/produse" className="text-[0.8125rem] tracking-[0.04em] text-ink/80 transition-colors hover:text-ink">
                {item.label}
              </Link>
              {open ? (
                <div className="absolute left-1/2 z-50 mt-5 w-[36rem] -translate-x-1/2 border border-line bg-card p-8">
                  <p className="eyebrow">{item.label}</p>
                  <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link prefetch={false} href={`/categorie/${category.slug}`} className="block py-1.5 text-sm text-ink/80 hover:text-ink">
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link prefetch={false} href="/produse" className="mt-6 inline-block text-sm underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <Link
            key={item.id}
            href={item.url || "/"}
            prefetch={false}
            className="text-[0.8125rem] tracking-[0.04em] text-ink/80 transition-colors hover:text-ink"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
