"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Menu, X } from "lucide-react";
import { IconButton } from "@/components/ui/primitives";

type NavItem = { id: string; url: string; label: string };

export function MobileNav({ items, label }: { items: NavItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <IconButton type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </IconButton>
      {open ? (
        <nav className="fixed inset-0 z-40 overflow-y-auto bg-paper px-6 pb-16 pt-24" aria-label={label}>
          <div className="mb-8 flex justify-end">
            <IconButton type="button" aria-label={label} onClick={() => setOpen(false)}>
              <X size={22} />
            </IconButton>
          </div>
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.url || "/"}
                  className="block py-3 text-2xl tracking-[-0.03em]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
