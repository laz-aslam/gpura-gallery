import { cache } from "react";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import { LANGUAGE_LABELS, TYPE_LABELS, type ArchiveItem } from "@/lib/types";

const DEFAULT_LIST_LIMIT = 24;
const SITEMAP_PAGE_SIZE = 50;

const getAdapter = cache(async () => getDataAdapter());

function trimItems(items: ArchiveItem[], limit: number): ArchiveItem[] {
  return items.slice(0, limit);
}

export const getFeaturedItems = cache(async (limit = 12): Promise<ArchiveItem[]> => {
  const adapter = await getAdapter();
  const response = await adapter.search({ page: 1, pageSize: Math.max(limit, 12) });
  return trimItems(response.items, limit);
});

export const getItemsByLanguage = cache(async (
  language: string,
  limit = DEFAULT_LIST_LIMIT
): Promise<ArchiveItem[]> => {
  const adapter = await getAdapter();
  const response = await adapter.search({
    page: 1,
    pageSize: limit,
    filters: { languages: [language] },
  });
  return response.items;
});

export const getItemsByType = cache(async (
  type: string,
  limit = DEFAULT_LIST_LIMIT
): Promise<ArchiveItem[]> => {
  const adapter = await getAdapter();
  const response = await adapter.search({
    page: 1,
    pageSize: limit,
    filters: { types: [type] },
  });
  return response.items;
});

export async function getSitemapItemIds(): Promise<string[]> {
  const adapter = await getAdapter();
  const ids = new Set<string>();

  try {
    const firstPage = await adapter.search({ page: 1, pageSize: SITEMAP_PAGE_SIZE });
    for (const item of firstPage.items) {
      ids.add(item.id);
    }

    const totalPages = Math.max(1, Math.ceil(firstPage.total / SITEMAP_PAGE_SIZE));

    for (let page = 2; page <= totalPages; page += 1) {
      try {
        const response = await adapter.search({ page, pageSize: SITEMAP_PAGE_SIZE });
        if (response.items.length === 0) {
          break;
        }

        for (const item of response.items) {
          ids.add(item.id);
        }
      } catch (error) {
        console.error(`Skipping sitemap page ${page}:`, error);
        break;
      }
    }
  } catch (error) {
    console.error("Falling back to a partial sitemap:", error);
  }

  return Array.from(ids);
}

export function getDiscoverLanguageLinks() {
  return Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
    href: `/discover/language/${code}`,
    code,
    label,
  }));
}

export function getDiscoverTypeLinks() {
  return Object.entries(TYPE_LABELS).map(([type, label]) => ({
    href: `/discover/type/${type}`,
    type,
    label,
  }));
}
