import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.APP_URL ?? "https://ravilo.ro";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/cont", "/checkout", "/cos", "/favorite", "/api", "/auth", "/preview"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
