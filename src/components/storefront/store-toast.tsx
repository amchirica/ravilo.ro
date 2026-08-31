"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string };

let nextId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function emitToast(message: string) {
  const toast = { id: ++nextId, message };
  listeners.forEach((listener) => listener(toast));
}

export function StoreToasts() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setItems((current) => [...current, toast]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== toast.id));
      }, 2800);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4" role="status" aria-live="polite">
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id} className="bg-ink px-4 py-3 text-sm text-paper">
            {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
