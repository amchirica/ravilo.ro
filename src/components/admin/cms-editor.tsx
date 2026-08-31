"use client";

import { useRef } from "react";

const TOOLS: { id: string; open: string; close: string }[] = [
  { id: "H1", open: "<h1>", close: "</h1>" },
  { id: "H2", open: "<h2>", close: "</h2>" },
  { id: "H3", open: "<h3>", close: "</h3>" },
  { id: "B", open: "<strong>", close: "</strong>" },
  { id: "I", open: "<em>", close: "</em>" },
  { id: "List", open: "<ul><li>", close: "</li></ul>" },
  { id: "Quote", open: "<blockquote>", close: "</blockquote>" },
  { id: "Link", open: '<a href="https://">', close: "</a>" },
  { id: "Img", open: '<img src="https://" alt="', close: '" />' },
  { id: "Table", open: "<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>", close: "</td></tr></tbody></table>" },
  { id: "HR", open: "<hr />", close: "" },
  { id: "Callout", open: "<aside>", close: "</aside>" },
];

export function CmsEditor({ name, defaultValue, label }: { name: string; defaultValue?: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function onTool(event: React.MouseEvent<HTMLButtonElement>) {
    const tool = TOOLS.find((item) => item.id === event.currentTarget.dataset.tool);
    const el = ref.current;
    if (!tool || !el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const selected = value.slice(start, end) || "text";
    el.value = `${value.slice(0, start)}${tool.open}${selected}${tool.close}${value.slice(end)}`;
    el.focus();
  }

  return (
    <label className="grid gap-2 text-sm">
      {label}
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((tool) => (
          <button key={tool.id} type="button" data-tool={tool.id} className="rounded border border-line px-2 py-1 text-xs" onClick={onTool}>
            {tool.id}
          </button>
        ))}
      </div>
      <textarea ref={ref} name={name} defaultValue={defaultValue} rows={18} className="w-full border border-line bg-paper px-3 py-2 font-mono text-sm" />
    </label>
  );
}
