import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  // Cloudflare Workers Builds runs `npm run build`. That script is OpenNext,
  // so Next itself must be invoked here — not via `npm run build` again.
  buildCommand: "npm run build:next",
};
