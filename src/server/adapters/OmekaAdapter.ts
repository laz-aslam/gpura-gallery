import type {
  ArchiveItem,
  ItemDetail,
  MediaFile,
  DocumentSource,
  SearchRequest,
  SearchResponse,
  TileRequest,
  Facets,
} from "@/lib/types";
import { TIME_RANGES } from "@/lib/types";
import type { DataAdapter } from "./DataAdapter";

// Environment configuration
const OMEKA_BASE_URL = process.env.OMEKA_BASE_URL || "https://gpura.org";
const OMEKA_ITEMS_ENDPOINT = process.env.OMEKA_ITEMS_ENDPOINT || "/api/items";

/**
 * Property mappings for Omeka S Dublin Core fields
 * These IDs are specific to gpura.org installation
 */
const PROPERTY_MAP = {
  title: "dcterms:title",
  creator: "dcterms:creator",
  date: "dcterms:date",
  issued: "dcterms:issued", // gpura uses this for dates
  language: "dcterms:language",
  type: "dcterms:type",
  description: "dcterms:description",
  subject: "dcterms:subject",
  publisher: "dcterms:publisher",
  rights: "dcterms:rights",
} as const;

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
  periodical: "periodical",
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

  /**
   * Get thumbnail URL from Omeka item
   */
  private getThumbnailUrl(item: OmekaItem): string | null {
    // Check for thumbnail_display_urls (gpura.org format)
    if (item.thumbnail_display_urls) {
      // Prefer large for better quality
      if (item.thumbnail_display_urls.large) {
        return item.thumbnail_display_urls.large;
      }
      if (item.thumbnail_display_urls.medium) {
        return item.thumbnail_display_urls.medium;
      }
      if (item.thumbnail_display_urls.square) {
        return item.thumbnail_display_urls.square;
      }
    }

    // Check for o:thumbnail_display_urls (alternative format)
    if (item["o:thumbnail_display_urls"]) {
      if (item["o:thumbnail_display_urls"]["large"]) {
        return item["o:thumbnail_display_urls"]["large"];
      }
      if (item["o:thumbnail_display_urls"]["medium"]) {
        return item["o:thumbnail_display_urls"]["medium"];
      }
    }

    // Check for thumbnail in media
    if (item["o:media"] && item["o:media"].length > 0) {
      const media = item["o:media"][0];
      if (typeof media === "object" && media !== null) {
        if (
          media["o:thumbnail_urls"] &&
          media["o:thumbnail_urls"]["large"]
        ) {
          return media["o:thumbnail_urls"]["large"];
        }
        if (media["o:thumbnail_url"]) {
          return media["o:thumbnail_url"];
        }
        if (
          media["o:thumbnail_urls"] &&
          media["o:thumbnail_urls"]["medium"]
        ) {
          return media["o:thumbnail_urls"]["medium"];
        }
      }
    }

    // Check for primary media
    if (item["o:primary_media"]) {
      const primary = item["o:primary_media"];
      if (typeof primary === "object" && primary !== null) {
        if (primary["o:thumbnail_url"]) {
          return primary["o:thumbnail_url"];
        }
      }
    }

    return null;
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

    const typeValue = this.getPropertyValue(item, PROPERTY_MAP.type);
    const type = this.normalizeType(typeValue);

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

    // Filters
    if (req.filters) {
      // Language filter
      if (req.filters.languages && req.filters.languages.length > 0) {
        // Omeka S property filter format
        params.set(
          "property[0][property]",
          PROPERTY_MAP.language
        );
        params.set("property[0][type]", "in");
        params.set(
          "property[0][text]",
          req.filters.languages.join(",")
        );
      }

      // Type filter
      if (req.filters.types && req.filters.types.length > 0) {
        params.set("property[1][property]", PROPERTY_MAP.type);
        params.set("property[1][type]", "in");
        params.set("property[1][text]", req.filters.types.join(","));
      }

      // Collection filter (item set)
      if (req.filters.collections && req.filters.collections.length > 0) {
        // Note: This requires item_set_id, which would need separate mapping
        // For now, we'll filter client-side
      }

      // Year range filter
      // Note: Omeka S doesn't have built-in date range filtering,
      // so we'd need to use property filters with date comparison
    }

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
    const params = this.buildQueryParams(req);
    const { items, totalResults } = await this.fetchItems(params);

    const transformedItems = items.map((item) => this.transformItem(item));

    // Apply client-side filters that Omeka doesn't support natively
    let filteredItems = transformedItems;

    if (req.filters) {
      // Year range filter (legacy single range)
      if (req.filters.yearMin !== undefined) {
        filteredItems = filteredItems.filter(
          (item) => item.year != null && item.year >= req.filters!.yearMin!
        );
      }
      if (req.filters.yearMax !== undefined) {
        filteredItems = filteredItems.filter(
          (item) => item.year != null && item.year <= req.filters!.yearMax!
        );
      }

      // Multi-select periods filter
      if (req.filters.periods && req.filters.periods.length > 0) {
        const selectedRanges = req.filters.periods
          .map(label => TIME_RANGES.find(r => r.label === label))
          .filter(r => r !== undefined);
        
        if (selectedRanges.length > 0) {
          filteredItems = filteredItems.filter((item) => {
            if (item.year == null) return false;
            return selectedRanges.some(range => {
              const min = range.min ?? -Infinity;
              const max = range.max ?? Infinity;
              return item.year! >= min && item.year! <= max;
            });
          });
        }
      }

      // Collection filter (client-side)
      if (req.filters.collections && req.filters.collections.length > 0) {
        filteredItems = filteredItems.filter(
          (item) =>
            item.collection &&
            req.filters!.collections!.includes(item.collection)
        );
      }
    }

    return {
      items: filteredItems,
      total: totalResults,
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
    // Keep original fetch count for speed
    const perPage = hasFilters ? Math.min(req.limit * 2, 50) : req.limit;
    params.set("per_page", String(perPage));
    params.set("sort_by", "created");
    params.set("sort_order", sortOrder);

    let transformedItems: ArchiveItem[] = [];
    try {
      const { items } = await this.fetchItems(params);
      transformedItems = items.map((item) => this.transformItem(item));
    } catch (error) {
      console.error("Error fetching tile items:", error);
      // Return empty array on error instead of crashing
      return [];
    }

    // Apply ALL filters client-side for reliability
    if (req.filters) {
      // Language filter
      if (req.filters.languages && req.filters.languages.length > 0) {
        transformedItems = transformedItems.filter(
          (item) => item.language && req.filters!.languages!.includes(item.language)
        );
      }

      // Type filter
      if (req.filters.types && req.filters.types.length > 0) {
        transformedItems = transformedItems.filter(
          (item) => item.type && req.filters!.types!.includes(item.type)
        );
      }

      // Year range filter (legacy single range)
      if (req.filters.yearMin !== undefined) {
        transformedItems = transformedItems.filter(
          (item) => item.year != null && item.year >= req.filters!.yearMin!
        );
      }
      if (req.filters.yearMax !== undefined) {
        transformedItems = transformedItems.filter(
          (item) => item.year != null && item.year <= req.filters!.yearMax!
        );
      }

      // Multi-select periods filter
      if (req.filters.periods && req.filters.periods.length > 0) {
        const selectedRanges = req.filters.periods
          .map(label => TIME_RANGES.find(r => r.label === label))
          .filter(r => r !== undefined);
        
        if (selectedRanges.length > 0) {
          transformedItems = transformedItems.filter((item) => {
            if (item.year == null) return false;
            return selectedRanges.some(range => {
              const min = range.min ?? -Infinity;
              const max = range.max ?? Infinity;
              return item.year! >= min && item.year! <= max;
            });
          });
        }
      }

      // Collection filter
      if (req.filters.collections && req.filters.collections.length > 0) {
        transformedItems = transformedItems.filter(
          (item) =>
            item.collection &&
            req.filters!.collections!.includes(item.collection)
        );
      }
    }

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

