import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "a",
  "span",
  "h1",
  "hr",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "aside",
];

export function sanitizeCmsHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    exclusiveFilter(frame) {
      return frame.tag === "script" || frame.tag === "style" || frame.tag === "iframe" || frame.tag === "object" || frame.tag === "embed";
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function clip(value: string, max: number): string {
  return value.slice(0, max);
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function plainTextToHtml(value: string): string {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replaceAll("\n", "<br />")}</p>`)
    .join("");
}
