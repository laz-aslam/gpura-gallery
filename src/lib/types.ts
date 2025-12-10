/**
 * Core data types for the gpura Infinite Canvas
 */

// ============================================
// Archive Item Types
// ============================================

/**
 * Base archive item from gpura/Omeka
 */
export type ArchiveItem = {
  id: string; // gpura/Omeka item ID
  title: string;
  year?: number | null;
  language?: string | null; // e.g. "ml", "en", "ta"
  type?: string | null; // book, periodical, image, audio, etc.
  collection?: string | null; // e.g. "Main collection", "Original collection"
  authors?: string[];
  thumbnailUrl?: string | null; // URL of cover / first page image
  sourceUrl: string; // gpura item URL
};

/**
 * Extended item with canvas positioning
 */
export type CanvasItem = ArchiveItem & {
  x: number; // world-space coords (px)
  y: number;
  width: number; // card size
  height: number;
  rotation?: number; // slight rotation for organic feel
  tileX: number;
  tileY: number;
};

/**
 * Media file from the archive (PDF, image, etc.)
 */
export type MediaFile = {
  id: string;
  type: "pdf" | "image" | "audio" | "video" | "iiif" | "other";
  url: string; // Original file URL or IIIF manifest URL
  thumbnailUrl?: string | null;
  title?: string | null;
  mimeType?: string | null;
};

/**
 * IIIF manifest page
 */
export type IIIFPage = {
  id: string;
  label?: string;
  imageUrl: string;
  width: number;
  height: number;
};

/**
 * Parsed IIIF manifest data
 */
export type IIIFManifest = {
  id: string;
  label: string;
  pages: IIIFPage[];
  totalPages: number;
};

/**
 * Document source info for viewer
 */
export type DocumentSource = {
  type: "iiif" | "pdf";
  url: string;
};

/**
 * Full item details for the drawer view
 */
export type ItemDetail = ArchiveItem & {
  description?: string | null;
  subjects?: string[];
  publisher?: string | null;
  rights?: string | null;
  fullImageUrl?: string | null; // Full resolution image for detail view
  media?: MediaFile[]; // All media files (PDFs, images, etc.)
  documentSource?: DocumentSource | null; // IIIF manifest or PDF URL for viewing
  raw?: unknown; // Optional raw Omeka payload for debugging
};

// ============================================
// Search & Filter Types
// ============================================

/**
 * Available filter options
 */
export type SearchFilters = {
  yearMin?: number;
  yearMax?: number;
  periods?: string[]; // Array of period labels for multi-select
  languages?: string[];
  types?: string[];
  collections?: string[];
};

/**
 * Search request parameters
 */
export type SearchRequest = {
  q?: string;
  filters?: SearchFilters;
  page?: number;
  pageSize?: number;
};

/**
 * Facet counts for filter UI
 */
export type Facets = {
  languages?: Record<string, number>;
  types?: Record<string, number>;
  collections?: Record<string, number>;
  years?: { min: number | null; max: number | null };
};

/**
 * Search API response
 */
export type SearchResponse = {
  items: ArchiveItem[];
  total: number;
  facets?: Facets;
};

// ============================================
// Tile Types (for infinite canvas loading)
// ============================================

/**
 * Request for a specific tile's items
 */
export type TileRequest = {
  tileX: number;
  tileY: number;
  q?: string;
  filters?: SearchFilters;
  limit: number;
  seed?: number; // Random seed for variety on each page refresh
};

/**
 * Response with items for a tile
 */
export type TileResponse = {
  tileX: number;
  tileY: number;
  items: ArchiveItem[];
};

/**
 * Cached tile data in the store
 */
export type TileCache = Map<string, {
  items: CanvasItem[];
  loading: boolean;
  error?: string;
}>;

// ============================================
// Canvas State Types
// ============================================

/**
 * Camera/viewport state
 */
export type CameraState = {
  x: number; // camera offset in px
  y: number;
  zoom: number; // 0.3 - 2.0
};

/**
 * Viewport bounds in world space
 */
export type ViewportBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

// ============================================
// Language & Type Mappings
// ============================================

export const LANGUAGE_LABELS: Record<string, string> = {
  ml: "മലയാളം (Malayalam)",
  en: "English",
  ta: "தமிழ் (Tamil)",
  sa: "संस्कृत (Sanskrit)",
  hi: "हिन्दी (Hindi)",
  kn: "ಕನ್ನಡ (Kannada)",
  te: "తెలుగు (Telugu)",
  ar: "العربية (Arabic)",
  pt: "Português (Portuguese)",
  nl: "Nederlands (Dutch)",
  de: "Deutsch (German)",
  fr: "Français (French)",
  la: "Latina (Latin)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
};

export const TYPE_LABELS: Record<string, string> = {
  book: "Book",
  periodical: "Periodical",
  image: "Image",
  audio: "Audio",
  video: "Video",
  manuscript: "Manuscript",
  map: "Map",
  newspaper: "Newspaper",
};

export const TIME_RANGES = [
  { label: "Before 1900", min: undefined, max: 1899 },
  { label: "1900–1947", min: 1900, max: 1947 },
  { label: "1947–1975", min: 1948, max: 1975 },
  { label: "1975–2000", min: 1976, max: 2000 },
  { label: "After 2000", min: 2001, max: undefined },
] as const;

