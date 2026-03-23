import type { MetadataRoute } from "next";
import { buildSiteUrl } from "@/lib/site-url";
import { LANGUAGE_LABELS, TYPE_LABELS } from "@/lib/types";
import { getSitemapItemIds } from "@/server/archive";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const itemIds = await getSitemapItemIds();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: buildSiteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: buildSiteUrl("/discover"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...Object.keys(LANGUAGE_LABELS).map((language) => ({
      url: buildSiteUrl(`/discover/language/${language}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...Object.keys(TYPE_LABELS).map((type) => ({
      url: buildSiteUrl(`/discover/type/${type}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  const itemRoutes: MetadataRoute.Sitemap = itemIds.map((id) => ({
    url: buildSiteUrl(`/${id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...itemRoutes];
}
