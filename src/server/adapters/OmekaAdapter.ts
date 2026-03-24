import type {
  ArchiveItem,
  ItemDetail,
  MediaFile,
  DocumentSource,
  SearchRequest,
  SearchResponse,
  SearchFilters,
  TileRequest,
  Facets,
} from "@/lib/types";
import { TIME_RANGES } from "@/lib/types";
import { getCache, CACHE_TTL } from "@/lib/cache";
import type { DataAdapter } from "./DataAdapter";

// Environment configuration
const OMEKA_BASE_URL = process.env.OMEKA_BASE_URL || "https://gpura.org";
const OMEKA_ITEMS_ENDPOINT = process.env.OMEKA_ITEMS_ENDPOINT || "/api/items";

/**
 * Property mappings for Omeka S Dublin Core fields
 * These IDs are specific to gpura.org installation
 */
const PROPERTY_MAP = {
  identifier: "dcterms:identifier",
  title: "dcterms:title",
  creator: "dcterms:creator",
  date: "dcterms:date",
  issued: "dcterms:issued", // gpura uses this for dates
  language: "dcterms:language",
  type: "dcterms:type",
  alternative: "dcterms:alternative",
  description: "dcterms:description",
  subject: "dcterms:subject",
  medium: "dcterms:medium",
  publisher: "dcterms:publisher",
  rights: "dcterms:rights",
} as const;

const PRODUCER_PROPERTY = "bibo:producer";
const fullItemIndexCache = getCache<ArchiveItem[]>("omeka-full-item-index");
let fullItemIndexPromise: Promise<ArchiveItem[]> | null = null;

/**
 * Language code mappings for Omeka values
 */
const LANGUAGE_MAP: Record<string, string> = {
  malayalam: "ml",
  english: "en",
  tamil: "ta",
  sanskrit: "sa",
  hindi: "hi",
  kannada: "kn",
  telugu: "te",
  arabic: "ar",
  portuguese: "pt",
  dutch: "nl",
  german: "de",
  french: "fr",
  latin: "la",
  punjabi: "pa",
  // ISO codes map to themselves
  ml: "ml",
  en: "en",
  ta: "ta",
  sa: "sa",
  hi: "hi",
};

/**
 * Type mappings for Omeka resource types
 */
const TYPE_MAP: Record<string, string> = {
  book: "book",
  books: "book",
  periodical: "periodical",
  periodicals: "periodical",
  image: "image",
  "still image": "image",
  audio: "audio",
  sound: "audio",
  video: "video",
  "moving image": "video",
  manuscript: "manuscript",
  text: "book",
  map: "map",
  newspaper: "newspaper",
};

const RESOURCE_CLASS_TYPE_MAP: Record<number, string> = {
  26: "image",
  30: "audio",
  33: "image",
  34: "video",
  40: "book",
  41: "book",
  52: "book",
  58: "image",
  70: "map",
  71: "book",
  100: "image",
};

/**
 * OmekaAdapter: Fetches and transforms data from gpura.org (Omeka S)
 */
export class OmekaAdapter implements DataAdapter {
  private baseUrl: string;
  private itemsEndpoint: string;

  constructor() {
    this.baseUrl = OMEKA_BASE_URL;
    this.itemsEndpoint = OMEKA_ITEMS_ENDPOINT;
  }

  private hasActiveFilters(filters?: SearchFilters): boolean {
    if (!filters) return false;

    return (
      (filters.languages?.length ?? 0) > 0 ||
      (filters.types?.length ?? 0) > 0 ||
      (filters.collections?.length ?? 0) > 0 ||
      (filters.periods?.length ?? 0) > 0 ||
      filters.yearMin !== undefined ||
      filters.yearMax !== undefined
    );
  }

  private applyClientSideFilters(
    items: ArchiveItem[],
    filters?: SearchFilters
  ): ArchiveItem[] {
    if (!filters) {
      return items;
    }

    let filteredItems = items;

    if (filters.languages && filters.languages.length > 0) {
      filteredItems = filteredItems.filter(
        (item) => item.language && filters.languages!.includes(item.language)
      );
    }

    if (filters.types && filters.types.length > 0) {
      filteredItems = filteredItems.filter(
        (item) => item.type && filters.types!.includes(item.type)
      );
    }

    if (filters.yearMin !== undefined) {
      filteredItems = filteredItems.filter(
        (item) => item.year != null && item.year >= filters.yearMin!
      );
    }

    if (filters.yearMax !== undefined) {
      filteredItems = filteredItems.filter(
        (item) => item.year != null && item.year <= filters.yearMax!
      );
    }

    if (filters.periods && filters.periods.length > 0) {
      const selectedRanges: Array<{ label: string; min?: number; max?: number }> = [];

      for (const label of filters.periods) {
          const predefined = TIME_RANGES.find((range) => range.label === label);
          if (predefined) {
            selectedRanges.push({
              label: predefined.label,
              min: predefined.min,
              max: predefined.max,
            });
            continue;
          }

          const rangeMatch = label.match(/^(\d{3,4})\s*[–-]\s*(\d{3,4})$/);
          if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10);
            const max = parseInt(rangeMatch[2], 10);
            selectedRanges.push({ label, min, max });
            continue;
          }

          const yearMatch = label.match(/^(\d{3,4})$/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            selectedRanges.push({ label, min: year, max: year });
          }
        }

      if (selectedRanges.length > 0) {
        filteredItems = filteredItems.filter((item) => {
          if (item.year == null) return false;
          const itemYear = item.year;

          return selectedRanges.some((range) => {
            const min = range.min ?? -Infinity;
            const max = range.max ?? Infinity;
            return itemYear >= min && itemYear <= max;
          });
        });
      }
    }

    if (filters.collections && filters.collections.length > 0) {
      filteredItems = filteredItems.filter(
        (item) =>
          item.collection &&
          filters.collections!.includes(item.collection)
      );
    }

    return filteredItems;
  }

  private async getFullItemIndex(): Promise<ArchiveItem[]> {
    const CACHE_KEY = "all-items-v2";
    const cached = fullItemIndexCache.get(CACHE_KEY, CACHE_TTL.DEFAULT);
    if (cached) {
      return cached;
    }

    if (fullItemIndexPromise) {
      return fullItemIndexPromise;
    }

    fullItemIndexPromise = (async () => {
      const perPage = 100;
      const firstBatch = await this.fetchIndexPage(1, perPage);
      const totalPages = Math.max(1, Math.ceil(firstBatch.totalResults / perPage));
      const seenIds = new Set<string>();
      const collected: ArchiveItem[] = [];

      const collectItems = (rawItems: OmekaItem[]) => {
        for (const item of rawItems) {
          const transformed = this.transformItem(item);
          if (seenIds.has(transformed.id)) {
            continue;
          }

          seenIds.add(transformed.id);
          collected.push(transformed);
        }
      };

      collectItems(firstBatch.items);

      const BATCH_SIZE = 2;
      for (let startPage = 2; startPage <= totalPages; startPage += BATCH_SIZE) {
        const pages = Array.from(
          { length: Math.min(BATCH_SIZE, totalPages - startPage + 1) },
          (_, index) => startPage + index
        );

        const batchResults = await Promise.all(
          pages.map(async (pageNumber) => {
            try {
              return await this.fetchIndexPage(pageNumber, perPage);
            } catch (error) {
              console.error(`Error indexing Omeka page ${pageNumber}:`, error);
              return { items: [] as OmekaItem[], totalResults: firstBatch.totalResults };
            }
          })
        );

        for (const batch of batchResults) {
          collectItems(batch.items);
        }
      }

      fullItemIndexCache.set(CACHE_KEY, collected);
      fullItemIndexCache.cleanup(CACHE_TTL.DEFAULT, 4);

      return collected;
    })().finally(() => {
      fullItemIndexPromise = null;
    });

    return fullItemIndexPromise;
  }

  private async fetchItemsWithRetry(
    params: URLSearchParams,
    attempts = 3
  ): Promise<{ items: OmekaItem[]; totalResults: number }> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.fetchItems(params);
      } catch (error) {
        lastError = error;

        if (attempt === attempts) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Omeka API request failed");
  }

  private async fetchIndexPage(
    page: number,
    perPage: number
  ): Promise<{ items: OmekaItem[]; totalResults: number }> {
    const params = new URLSearchParams({
      per_page: String(perPage),
      sort_by: "id",
      sort_order: "asc",
      page: String(page),
    });

    try {
      return await this.fetchItemsWithRetry(params);
    } catch (error) {
      if (perPage <= 25) {
        throw error;
      }

      const childPerPage = Math.floor(perPage / 2);
      const pagesPerParent = Math.ceil(perPage / childPerPage);
      const firstChildPage = (page - 1) * pagesPerParent + 1;
      const childPages = Array.from(
        { length: pagesPerParent },
        (_, index) => firstChildPage + index
      );
      const childResults = await Promise.all(
        childPages.map((childPage) => this.fetchIndexPage(childPage, childPerPage))
      );

      return {
        items: childResults.flatMap((result) => result.items),
        totalResults: childResults[0]?.totalResults ?? 0,
      };
    }
  }

  private async searchByFilterScan(req: SearchRequest): Promise<SearchResponse> {
    const page = req.page || 1;
    const pageSize = req.pageSize || 40;
    const allItems = await this.getFullItemIndex();
    const filteredItems = this.applyClientSideFilters(allItems, req.filters);
    const sortedItems = [...filteredItems].sort((a, b) => {
      const idA = Number.parseInt(a.id, 10);
      const idB = Number.parseInt(b.id, 10);

      if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) {
        return idB - idA;
      }

      const yearA = a.year ?? -Infinity;
      const yearB = b.year ?? -Infinity;
      return yearB - yearA;
    });
    const offset = (page - 1) * pageSize;

    return {
      items: sortedItems.slice(offset, offset + pageSize),
      total: sortedItems.length,
      facets: this.computeFacets(allItems),
    };
  }

  /**
   * Extract a property value from Omeka item
   */
  private getPropertyValue(
    item: OmekaItem,
    property: string
  ): string | undefined {
    const values = item[property];
    if (!values || !Array.isArray(values) || values.length === 0) {
      return undefined;
    }

    // Get the first value
    const firstValue = values[0];
    if (typeof firstValue === "object" && firstValue !== null) {
      // Handle different value types
      if ("@value" in firstValue) {
        return firstValue["@value"];
      }
      if ("o:label" in firstValue) {
        return firstValue["o:label"];
      }
    }

    return undefined;
  }

  /**
   * Extract all values for a property
   */
  private getAllPropertyValues(
    item: OmekaItem,
    property: string
  ): string[] {
    const values = item[property];
    if (!values || !Array.isArray(values)) {
      return [];
    }

    return values
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          if ("@value" in v) return v["@value"];
          if ("o:label" in v) return v["o:label"];
        }
        return null;
      })
      .filter((v): v is string => v !== null);
  }

  /**
   * Extract year from date string
   */
  private extractYear(dateStr?: string): number | null {
    if (!dateStr) return null;

    // Try to extract a 4-digit year
    const match = dateStr.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  }

  /**
   * Normalize language value to ISO code
   */
  private normalizeLanguage(lang?: string): string | null {
    if (!lang) return null;
    const lower = lang.toLowerCase().trim();
    return LANGUAGE_MAP[lower] || lower.substring(0, 2);
  }

  /**
   * Normalize type value
   */
  private normalizeType(type?: string): string | null {
    if (!type) return null;
    const lower = type.toLowerCase().trim();
    return TYPE_MAP[lower] || lower;
  }

  private detectCanonicalType(value?: string): string | null {
    const normalized = this.normalizeType(value);
    if (!normalized) return null;

    if (TYPE_MAP[normalized]) {
      return TYPE_MAP[normalized];
    }

    if (/\bnewspapers?\b/.test(normalized)) return "newspaper";
    if (/\b(periodical|periodicals|journal|journals|magazine|magazines|serial|serials)\b/.test(normalized)) return "periodical";
    if (/\b(manuscript|manuscripts)\b/.test(normalized)) return "manuscript";
    if (/\b(image|images|photograph|photographs|photo|photos|poster|posters)\b/.test(normalized)) return "image";
    if (/\b(audio|sound|recording|recordings|song|songs|music)\b/.test(normalized)) return "audio";
    if (/\b(video|videos|moving image|film|films)\b/.test(normalized)) return "video";
    if (/\b(map|maps|atlas|atlases)\b/.test(normalized)) return "map";
    if (/\b(book|books|text ?book|text ?books|textbook|textbooks|reader|readers|primer|primers)\b/.test(normalized)) return "book";

    return null;
  }

  private getResourceClassType(item: OmekaItem): string | null {
    const resourceClass = item["o:resource_class"];
    if (!resourceClass || typeof resourceClass !== "object") {
      return null;
    }

    const rawId = (resourceClass as Record<string, unknown>)["o:id"];
    const id = typeof rawId === "number" ? rawId : Number.parseInt(String(rawId ?? ""), 10);
    if (!Number.isFinite(id)) {
      return null;
    }

    return RESOURCE_CLASS_TYPE_MAP[id] || null;
  }

  private inferTypeFromMetadata({
    title,
    subjects = [],
    identifiers = [],
    alternatives = [],
    producers = [],
    mediums = [],
  }: {
    title?: string;
    subjects?: string[];
    identifiers?: string[];
    alternatives?: string[];
    producers?: string[];
    mediums?: string[];
  }): string | null {
    const signals = [
      title,
      ...subjects,
      ...identifiers,
      ...alternatives,
      ...producers,
      ...mediums,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase().trim());

    if (signals.length === 0) {
      return null;
    }

    const combined = signals.join(" | ");
    const hasSerialMarker =
      combined.includes("ലക്കം") ||
      combined.includes("പുസ്തകം") ||
      combined.includes("വോള്യം") ||
      combined.includes("വാല്യം") ||
      /\b(issue|volume|number|no\.?|vol\.?)\b/.test(combined);
    const hasManuscriptSignal =
      combined.includes("കൈയെഴുത്ത്") ||
      combined.includes("താളിയോല") ||
      /\b(manuscript|palm leaves?|palm leaf)\b/.test(combined);

    if (hasManuscriptSignal) {
      return "manuscript";
    }

    const hasMapSignal =
      /\b(map|atlas)\b/.test(combined) ||
      combined.includes("district map") ||
      combined.includes("survey map") ||
      combined.includes("route map");

    if (hasMapSignal) {
      return "map";
    }

    const hasAudioSignal =
      combined.includes("ഓഡിയോ") ||
      /\b(audio|audio file|sound recording|sound track|soundtrack)\b/.test(combined);

    if (hasAudioSignal) {
      return "audio";
    }

    const hasVideoSignal =
      /\b(video|film|motion picture|moving image)\b/.test(combined);

    if (hasVideoSignal) {
      return "video";
    }

    const hasNewspaperSignal =
      combined.includes("പ്രതിപക്ഷപത്രം") ||
      combined.includes("ദിനപത്ര") ||
      combined.includes("വാർത്താപത്ര") ||
      /\bgazette\b/.test(combined) ||
      (/\b(news[- ]?paper|daily)\b/.test(combined) && hasSerialMarker) ||
      ((combined.includes("പത്രം") || /\bpathram\b/.test(combined)) && hasSerialMarker);

    if (hasNewspaperSignal) {
      return "newspaper";
    }

    const hasPeriodicalSignal =
      combined.includes("ആഴ്ചപ്പതിപ്പ്") ||
      combined.includes("മാസിക") ||
      combined.includes("വാരിക") ||
      combined.includes("പത്രിക") ||
      /\b(pathrika|periodical|periodicals|journal|magazine|monthly|montly|weekly|review|annual|souvenir|bulletin)\b/.test(combined);

    if (hasPeriodicalSignal) {
      return "periodical";
    }

    const hasImageSignal =
      /\b(photo|photograph|poster|portrait|drawing|illustration|painting|still image)\b/.test(combined);

    if (hasImageSignal) {
      return "image";
    }

    return null;
  }

  private resolveCanonicalType(
    typeValues: string[],
    resourceClassType: string | null,
    metadata: {
      title?: string;
      subjects?: string[];
      identifiers?: string[];
      alternatives?: string[];
      producers?: string[];
      mediums?: string[];
    }
  ): string | null {
    if (resourceClassType) {
      return resourceClassType;
    }

    for (const value of typeValues) {
      const canonicalType = this.detectCanonicalType(value);
      if (canonicalType) {
        return canonicalType;
      }
    }

    const inferredType = this.inferTypeFromMetadata(metadata);
    if (inferredType) {
      return inferredType;
    }

    if (typeValues.some((value) => value.toLowerCase().includes("bibo:book"))) {
      return "book";
    }

    if (typeValues.some((value) => value.toLowerCase().includes("dctype:text"))) {
      return "book";
    }

    return null;
  }

  /**
   * Check if a thumbnail URL is a placeholder image (not real content)
   */
  private isPlaceholderThumbnail(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    // Omeka default/placeholder patterns
    return (
      lowerUrl.includes("/application/") ||
      lowerUrl.includes("/asset/") ||
      lowerUrl.includes("default") ||
      lowerUrl.includes("placeholder") ||
      lowerUrl.includes("fallback") ||
      lowerUrl.endsWith(".svg")
    );
  }

  /**
   * Fetch actual thumbnail from media details (first page of PDF/IIIF)
   */
  private async fetchMediaThumbnail(mediaRef: OmekaMediaRef): Promise<string | null> {
    if (!mediaRef["@id"]) return null;

    try {
      const response = await fetch(mediaRef["@id"], {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return null;

      const mediaDetail = await response.json();

      // Check for thumbnail URLs in media detail
      if (mediaDetail["o:thumbnail_urls"]) {
        const urls = mediaDetail["o:thumbnail_urls"];
        const thumb = urls["large"] || urls["medium"] || urls["square"];
        if (thumb && !this.isPlaceholderThumbnail(thumb)) {
          return thumb;
        }
      }

      // For IIIF items, try to construct thumbnail from manifest
      if (mediaDetail["o:ingester"] === "iiif" && mediaDetail["o:source"]) {
        const manifestUrl = mediaDetail["o:source"];
        try {
          const manifestResp = await fetch(manifestUrl, {
            headers: { Accept: "application/json" },
          });
          if (manifestResp.ok) {
            const manifest = await manifestResp.json();
            // IIIF Presentation 3.0
            if (manifest.items && manifest.items[0]) {
              const canvas = manifest.items[0];
              if (canvas.thumbnail && canvas.thumbnail[0]?.id) {
                return canvas.thumbnail[0].id;
              }
              // Try to get from annotation
              if (canvas.items?.[0]?.items?.[0]?.body?.id) {
                const imageId = canvas.items[0].items[0].body.id;
                // Convert to thumbnail size
                return imageId.replace(/\/full\/.*$/, "/full/400,/0/default.jpg");
              }
            }
            // IIIF Presentation 2.0
            if (manifest.sequences?.[0]?.canvases?.[0]) {
              const canvas = manifest.sequences[0].canvases[0];
              if (canvas.thumbnail?.["@id"]) {
                return canvas.thumbnail["@id"];
              }
              if (canvas.images?.[0]?.resource?.["@id"]) {
                const imageId = canvas.images[0].resource["@id"];
                return imageId.replace(/\/full\/.*$/, "/full/400,/0/default.jpg");
              }
            }
          }
        } catch {
          // Ignore IIIF fetch errors
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get thumbnail URL from Omeka item
   */
  private getThumbnailUrl(item: OmekaItem): string | null {
    let url: string | null = null;

    // Check for thumbnail_display_urls (gpura.org format) - most common in list responses
    if (item.thumbnail_display_urls) {
      // Prefer large for better quality, fallback to others
      url = (
        item.thumbnail_display_urls.large ||
        item.thumbnail_display_urls.medium ||
        item.thumbnail_display_urls.square ||
        null
      );
    }

    // Check for o:thumbnail_display_urls (alternative format)
    if (!url && item["o:thumbnail_display_urls"]) {
      const urls = item["o:thumbnail_display_urls"];
      url = urls["large"] || urls["medium"] || urls["square"] || null;
    }

    // Check for primary media first (often has the main thumbnail)
    if (!url && item["o:primary_media"]) {
      const primary = item["o:primary_media"];
      if (typeof primary === "object" && primary !== null) {
        if (primary["o:thumbnail_urls"]) {
          const urls = primary["o:thumbnail_urls"];
          url = urls["large"] || urls["medium"] || urls["square"] || null;
        }
        if (!url && primary["o:thumbnail_url"]) {
          url = primary["o:thumbnail_url"];
        }
      }
    }

    // Check for thumbnail in media array
    if (!url && item["o:media"] && item["o:media"].length > 0) {
      for (const media of item["o:media"]) {
        if (typeof media === "object" && media !== null) {
          if (media["o:thumbnail_urls"]) {
            const urls = media["o:thumbnail_urls"];
            url = urls["large"] || urls["medium"] || urls["square"] || null;
            if (url) break;
          }
          if (!url && media["o:thumbnail_url"]) {
            url = media["o:thumbnail_url"];
            break;
          }
        }
      }
    }

    // Filter out placeholder images
    if (url && this.isPlaceholderThumbnail(url)) {
      return null;
    }

    return url;
  }

  /**
   * Get full-size original image URL from Omeka item
   */
  private getFullImageUrl(item: OmekaItem): string | null {
    // Check for original URL in media
    if (item["o:media"] && item["o:media"].length > 0) {
      const media = item["o:media"][0];
      if (typeof media === "object" && media !== null) {
        // Try to get original URL
        if (media["o:original_url"]) {
          return media["o:original_url"] as string;
        }
        // Fallback to large thumbnail
        if (media["o:thumbnail_urls"] && media["o:thumbnail_urls"]["large"]) {
          return media["o:thumbnail_urls"]["large"];
        }
      }
    }

    // Check for primary media original
    if (item["o:primary_media"]) {
      const primary = item["o:primary_media"];
      if (typeof primary === "object" && primary !== null) {
        if (primary["o:original_url"]) {
          return primary["o:original_url"] as string;
        }
      }
    }

    // Fallback to large thumbnail
    if (item.thumbnail_display_urls?.large) {
      return item.thumbnail_display_urls.large;
    }
    if (item["o:thumbnail_display_urls"]?.["large"]) {
      return item["o:thumbnail_display_urls"]["large"];
    }

    return null;
  }

  /**
   * Get collection name from item set
   */
  private getCollectionName(item: OmekaItem): string | null {
    if (item["o:item_set"] && item["o:item_set"].length > 0) {
      const itemSet = item["o:item_set"][0];
      if (typeof itemSet === "object" && itemSet !== null) {
        return itemSet["o:title"] || null;
      }
    }
    return null;
  }

  /**
   * Determine media type from MIME type or URL
   */
  private getMediaType(mimeType?: string, url?: string): MediaFile["type"] {
    if (mimeType) {
      if (mimeType === "application/pdf") return "pdf";
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("audio/")) return "audio";
      if (mimeType.startsWith("video/")) return "video";
    }
    
    // Fallback to URL extension check
    if (url) {
      const lower = url.toLowerCase();
      if (lower.endsWith(".pdf")) return "pdf";
      if (lower.match(/\.(jpg|jpeg|png|gif|webp|tiff?)$/)) return "image";
      if (lower.match(/\.(mp3|wav|ogg|flac)$/)) return "audio";
      if (lower.match(/\.(mp4|webm|mov|avi)$/)) return "video";
    }
    
    return "other";
  }

  /**
   * Parse all media files from Omeka item
   */
  private parseMedia(item: OmekaItem): MediaFile[] {
    const mediaList: MediaFile[] = [];
    
    if (!item["o:media"] || !Array.isArray(item["o:media"])) {
      return mediaList;
    }

    for (const media of item["o:media"]) {
      if (typeof media !== "object" || media === null) continue;
      
      const originalUrl = media["o:original_url"] as string | undefined;
      if (!originalUrl) continue;
      
      const mimeType = media["o:media_type"] as string | undefined;
      const mediaType = this.getMediaType(mimeType, originalUrl);
      
      // Get thumbnail URL
      let thumbnailUrl: string | null = null;
      if (media["o:thumbnail_urls"]) {
        thumbnailUrl = 
          media["o:thumbnail_urls"]["large"] ||
          media["o:thumbnail_urls"]["medium"] ||
          media["o:thumbnail_urls"]["square"] ||
          null;
      } else if (media["o:thumbnail_url"]) {
        thumbnailUrl = media["o:thumbnail_url"];
      }
      
      mediaList.push({
        id: String(media["o:id"] || mediaList.length),
        type: mediaType,
        url: originalUrl,
        thumbnailUrl,
        title: (media["o:title"] as string) || null,
        mimeType: mimeType || null,
      });
    }

    return mediaList;
  }

  /**
   * Transform Omeka item to ArchiveItem
   */
  private transformItem(item: OmekaItem): ArchiveItem {
    const title =
      this.getPropertyValue(item, PROPERTY_MAP.title) ||
      item["o:title"] ||
      "Untitled";

    // Try dcterms:issued first (gpura format), then dcterms:date
    const dateStr = 
      this.getPropertyValue(item, PROPERTY_MAP.issued) ||
      this.getPropertyValue(item, PROPERTY_MAP.date);
    const year = this.extractYear(dateStr);

    const langValue = this.getPropertyValue(item, PROPERTY_MAP.language);
    const language = this.normalizeLanguage(langValue);

    const typeValues = [
      ...this.getAllPropertyValues(item, PROPERTY_MAP.type),
      ...(Array.isArray(item["@type"])
        ? item["@type"].filter((value): value is string => typeof value === "string")
        : typeof item["@type"] === "string"
          ? [item["@type"]]
          : []),
    ];
    const subjects = this.getAllPropertyValues(item, PROPERTY_MAP.subject);
    const identifiers = this.getAllPropertyValues(item, PROPERTY_MAP.identifier);
    const alternatives = this.getAllPropertyValues(item, PROPERTY_MAP.alternative);
    const producers = this.getAllPropertyValues(item, PRODUCER_PROPERTY);
    const mediums = this.getAllPropertyValues(item, PROPERTY_MAP.medium);
    const resourceClassType = this.getResourceClassType(item);
    const type = this.resolveCanonicalType(typeValues, resourceClassType, {
      title,
      subjects,
      identifiers,
      alternatives,
      producers,
      mediums,
    });

    const authors = this.getAllPropertyValues(item, PROPERTY_MAP.creator);

    return {
      id: String(item["o:id"]),
      title,
      year,
      language,
      type,
      collection: this.getCollectionName(item),
      authors: authors.length > 0 ? authors : undefined,
      thumbnailUrl: this.getThumbnailUrl(item),
      sourceUrl: `${this.baseUrl}/item/${item["o:id"]}`,
    };
  }

  /**
   * Transform Omeka item to ItemDetail (sync version without IIIF)
   */
  private transformItemDetailSync(item: OmekaItem): ItemDetail {
    const base = this.transformItem(item);

    const description = this.getPropertyValue(item, PROPERTY_MAP.description);
    const subjects = this.getAllPropertyValues(item, PROPERTY_MAP.subject);
    const publisher = this.getPropertyValue(item, PROPERTY_MAP.publisher);
    const rights = this.getPropertyValue(item, PROPERTY_MAP.rights);
    const fullImageUrl = this.getFullImageUrl(item);
    const media = this.parseMedia(item);

    return {
      ...base,
      description: description || null,
      subjects: subjects.length > 0 ? subjects : undefined,
      publisher: publisher || null,
      rights: rights || null,
      fullImageUrl: fullImageUrl || base.thumbnailUrl,
      media: media.length > 0 ? media : undefined,
      raw: item,
    };
  }

  /**
   * Fetch document source (IIIF manifest or PDF) from media details
   */
  private async fetchDocumentSource(mediaRefs: OmekaMediaRef[]): Promise<DocumentSource | null> {
    // Try each media reference until we find viewable content
    for (const ref of mediaRefs) {
      if (!ref["@id"]) continue;
      
      try {
        const response = await fetch(ref["@id"], {
          headers: { Accept: "application/json" },
        });
        
        if (!response.ok) continue;
        
        const mediaDetail = await response.json();
        
        // Check for IIIF manifest in o:source (common for IIIF ingesters)
        if (mediaDetail["o:source"] && 
            typeof mediaDetail["o:source"] === "string" &&
            mediaDetail["o:source"].includes("manifest")) {
          return { type: "iiif", url: mediaDetail["o:source"] };
        }
        
        // Check for IIIF ingester type
        if (mediaDetail["o:ingester"] === "iiif" && mediaDetail["o:source"]) {
          return { type: "iiif", url: mediaDetail["o:source"] };
        }
        
        // Check for direct PDF
        if (mediaDetail["o:media_type"] === "application/pdf") {
          // Prefer o:original_url, fallback to o:source
          const pdfUrl = mediaDetail["o:original_url"] || mediaDetail["o:source"];
          if (pdfUrl && typeof pdfUrl === "string") {
            return { type: "pdf", url: pdfUrl };
          }
        }
      } catch {
        // Continue to next media
        continue;
      }
    }
    
    return null;
  }

  /**
   * Transform Omeka item to ItemDetail with document source support
   */
  private async transformItemDetail(item: OmekaItem): Promise<ItemDetail> {
    const base = this.transformItemDetailSync(item);
    
    // Try to get document source (IIIF manifest or PDF) from media
    let documentSource: DocumentSource | null = null;
    if (item["o:media"] && item["o:media"].length > 0) {
      documentSource = await this.fetchDocumentSource(item["o:media"] as OmekaMediaRef[]);
    }

    return {
      ...base,
      documentSource,
    };
  }

  /**
   * Build query params for Omeka API
   */
  private buildQueryParams(req: SearchRequest): URLSearchParams {
    const params = new URLSearchParams();

    // Text search
    if (req.q) {
      params.set("search", req.q);
    }

    // Pagination
    const page = req.page || 1;
    const perPage = req.pageSize || 40;
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    // Sort by date descending by default
    params.set("sort_by", "created");
    params.set("sort_order", "desc");

    return params;
  }

  /**
   * Fetch items from Omeka API
   */
  private async fetchItems(params: URLSearchParams): Promise<{
    items: OmekaItem[];
    totalResults: number;
  }> {
    const url = `${this.baseUrl}${this.itemsEndpoint}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    });

    if (!response.ok) {
      throw new Error(`Omeka API error: ${response.status} ${response.statusText}`);
    }

    const items = await response.json();

    // Try to get total from headers
    const totalHeader = response.headers.get("Omeka-S-Total-Results");
    const totalResults = totalHeader ? parseInt(totalHeader, 10) : items.length;

    return { items, totalResults };
  }

  /**
   * Compute facets from items
   */
  private computeFacets(items: ArchiveItem[]): Facets {
    const languages: Record<string, number> = {};
    const types: Record<string, number> = {};
    const collections: Record<string, number> = {};
    let minYear: number | null = null;
    let maxYear: number | null = null;

    for (const item of items) {
      if (item.language) {
        languages[item.language] = (languages[item.language] || 0) + 1;
      }
      if (item.type) {
        types[item.type] = (types[item.type] || 0) + 1;
      }
      if (item.collection) {
        collections[item.collection] = (collections[item.collection] || 0) + 1;
      }
      if (item.year) {
        if (minYear === null || item.year < minYear) minYear = item.year;
        if (maxYear === null || item.year > maxYear) maxYear = item.year;
      }
    }

    return {
      languages,
      types,
      collections,
      years: { min: minYear, max: maxYear },
    };
  }

  /**
   * Search items with query and filters
   */
  async search(req: SearchRequest): Promise<SearchResponse> {
    if (req.scanFilters && !req.q?.trim() && this.hasActiveFilters(req.filters)) {
      return this.searchByFilterScan(req);
    }

    const params = this.buildQueryParams(req);
    const { items, totalResults } = await this.fetchItems(params);

    const transformedItems = items.map((item) => this.transformItem(item));

    // Apply all filters client-side so search and tile browsing stay aligned.
    let filteredItems = this.applyClientSideFilters(transformedItems, req.filters);

    // If client-side filtering was applied, we need to estimate the total
    // Since we can't know the true filtered total without fetching everything,
    // we return the filtered count for this page when filters reduce results significantly
    const hasClientSideFilters = this.hasActiveFilters(req.filters);
    
    // Calculate estimated total based on filter ratio
    let estimatedTotal = totalResults;
    if (hasClientSideFilters && transformedItems.length > 0) {
      const filterRatio = filteredItems.length / transformedItems.length;
      // If ratio is 0, we can't reliably estimate - return -1 to indicate "unknown"
      // This happens when the current page sample doesn't have items matching the filter
      if (filterRatio === 0) {
        estimatedTotal = -1; // Signal that count is unreliable
      } else {
        estimatedTotal = Math.round(totalResults * filterRatio);
      }
    }

    return {
      items: filteredItems,
      total: estimatedTotal,
      facets: this.computeFacets(transformedItems),
    };
  }

  /**
   * Shuffle array using seeded random for consistent results per tile
   */
  private shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let s = seed;
    for (let i = result.length - 1; i > 0; i--) {
      // Simple seeded random
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Fetch items for a specific tile
   */
  async fetchTile(req: TileRequest): Promise<ArchiveItem[]> {
    const hasFilters = req.filters && (
      (req.filters.languages && req.filters.languages.length > 0) ||
      (req.filters.types && req.filters.types.length > 0) ||
      (req.filters.periods && req.filters.periods.length > 0) ||
      req.filters.yearMin !== undefined ||
      req.filters.yearMax !== undefined
    );

    // Use prime strides to spread adjacent tiles apart
    const seed = req.seed || 0;
    const PRIME_X = 7;
    const PRIME_Y = 11;
    const MAX_PAGES = 100; // Stay within available pages
    
    // Ensure positive values for tile coords
    const absX = Math.abs(req.tileX) + (req.tileX < 0 ? 100 : 0);
    const absY = Math.abs(req.tileY) + (req.tileY < 0 ? 100 : 0);
    const page = ((absX * PRIME_X + absY * PRIME_Y + seed) % MAX_PAGES) + 1;
    
    // Vary sort order (asc/desc) for variety
    const sortOrder = ((absX + absY + seed) % 2 === 0) ? "desc" : "asc";

    const params = new URLSearchParams();

    if (req.q) {
      params.set("search", req.q);
    }

    params.set("page", String(page));
    // Always fetch max items to compensate for thumbnail filtering (some items lack thumbnails)
    params.set("per_page", "50");
    params.set("sort_by", "created");
    params.set("sort_order", sortOrder);

    let transformedItems: ArchiveItem[] = [];
    let rawItems: OmekaItem[] = [];
    try {
      const { items } = await this.fetchItems(params);
      rawItems = items;
      transformedItems = items.map((item) => this.transformItem(item));
    } catch (error) {
      console.error("Error fetching tile items:", error);
      // Return empty array on error instead of crashing
      return [];
    }

    transformedItems = this.applyClientSideFilters(transformedItems, req.filters);

    // For items with placeholder thumbnails, try to fetch real thumbnails from media
    const itemsNeedingThumbnails: { index: number; rawItem: OmekaItem }[] = [];
    
    for (let i = 0; i < transformedItems.length; i++) {
      const item = transformedItems[i];
      const rawItem = rawItems.find(r => String(r["o:id"]) === item.id);
      
      if (!item.thumbnailUrl || item.thumbnailUrl.trim().length === 0) {
        // No thumbnail at all - try to fetch from media
        if (rawItem?.["o:media"]?.length) {
          itemsNeedingThumbnails.push({ index: i, rawItem });
        }
      } else if (this.isPlaceholderThumbnail(item.thumbnailUrl)) {
        // Has placeholder - try to get real thumbnail
        if (rawItem?.["o:media"]?.length) {
          itemsNeedingThumbnails.push({ index: i, rawItem });
        } else {
          // Can't get real thumbnail, clear it
          transformedItems[i] = { ...item, thumbnailUrl: null };
        }
      }
    }
    
    // Fetch real thumbnails for items that need them (limit to avoid slowdown)
    const MAX_THUMBNAIL_FETCHES = 15;
    const fetchPromises = itemsNeedingThumbnails.slice(0, MAX_THUMBNAIL_FETCHES).map(async ({ index, rawItem }) => {
      const mediaRefs = rawItem["o:media"] as OmekaMediaRef[];
      for (const mediaRef of mediaRefs) {
        const realThumb = await this.fetchMediaThumbnail(mediaRef);
        if (realThumb) {
          transformedItems[index] = { ...transformedItems[index], thumbnailUrl: realThumb };
          return;
        }
      }
      // No real thumbnail found, clear it
      transformedItems[index] = { ...transformedItems[index], thumbnailUrl: null };
    });
    
    await Promise.all(fetchPromises);
    
    // Clear thumbnails for items we couldn't process
    for (const { index } of itemsNeedingThumbnails.slice(MAX_THUMBNAIL_FETCHES)) {
      if (transformedItems[index].thumbnailUrl && this.isPlaceholderThumbnail(transformedItems[index].thumbnailUrl!)) {
        transformedItems[index] = { ...transformedItems[index], thumbnailUrl: null };
      }
    }

    // Filter out items without valid thumbnails
    transformedItems = transformedItems.filter(
      (item) => item.thumbnailUrl && item.thumbnailUrl.trim().length > 0
    );

    // Shuffle items using tile-specific seed for unique ordering per tile
    const tileSeed = absX * 1000 + absY + seed;
    const shuffled = this.shuffleWithSeed(transformedItems, tileSeed);

    // Return only the requested limit
    return shuffled.slice(0, req.limit);
  }

  /**
   * Get detailed information for a single item
   */
  async getItem(id: string): Promise<ItemDetail | null> {
    const url = `${this.baseUrl}${this.itemsEndpoint}/${id}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        next: {
          revalidate: 300,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Omeka API error: ${response.status}`);
      }

      const item = await response.json();
      return await this.transformItemDetail(item);
    } catch (error) {
      console.error(`Error fetching item ${id}:`, error);
      return null;
    }
  }
}

/**
 * Omeka S item response type
 */
interface OmekaItem {
  "o:id": number;
  "o:title"?: string;
  "o:media"?: OmekaMedia[];
  "o:primary_media"?: OmekaMedia;
  "o:item_set"?: OmekaItemSet[];
  "o:thumbnail_display_urls"?: Record<string, string>;
  thumbnail_display_urls?: Record<string, string>; // gpura.org format
  [key: string]: unknown;
}

interface OmekaMedia {
  "o:id"?: number;
  "o:title"?: string;
  "o:original_url"?: string;
  "o:media_type"?: string;
  "o:thumbnail_url"?: string;
  "o:thumbnail_urls"?: Record<string, string>;
  [key: string]: unknown;
}

interface OmekaItemSet {
  "o:id"?: number;
  "o:title"?: string;
  [key: string]: unknown;
}

interface OmekaMediaRef {
  "@id"?: string;
  "o:id"?: number;
}
