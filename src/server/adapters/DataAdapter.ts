import type {
  ArchiveItem,
  ItemDetail,
  SearchRequest,
  SearchResponse,
  TileRequest,
} from "@/lib/types";

/**
 * Abstract data adapter interface
 * Implement this for different archive backends (Omeka S, custom APIs, etc.)
 */
export interface DataAdapter {
  /**
   * Search items with query and filters
   */
  search(req: SearchRequest): Promise<SearchResponse>;

  /**
   * Fetch items for a specific tile
   */
  fetchTile(req: TileRequest): Promise<ArchiveItem[]>;

  /**
   * Get detailed information for a single item
   */
  getItem(id: string): Promise<ItemDetail | null>;
}

/**
 * Get the singleton data adapter instance
 * Currently returns OmekaAdapter, but can be swapped for other implementations
 */
export async function getDataAdapter(): Promise<DataAdapter> {
  // Dynamic import to keep server-only code out of client bundle
  const { OmekaAdapter } = await import("./OmekaAdapter");
  return new OmekaAdapter();
}




