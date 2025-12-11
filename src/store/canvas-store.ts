"use client";

import { create } from "zustand";
import { canvasConfig } from "@/config/site";
import type { ArchiveItem, CanvasItem, SearchFilters } from "@/lib/types";
import {
  getTileKey,
  itemsToCanvasItems,
  hashFilters,
} from "@/lib/canvas-utils";

interface TileData {
  items: CanvasItem[];
  loading: boolean;
  error?: string;
  timestamp: number;
}

interface SearchState {
  results: ArchiveItem[];
  total: number;
  loading: boolean;
  error?: string;
  page: number;
  hasMore: boolean;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - match server cache
const MAX_CONCURRENT_REQUESTS = 6; // Limit concurrent fetches
const inFlightRequests = new Map<string, Promise<void>>();
let activeRequestCount = 0; // Track actual in-flight requests separately
const requestQueue: Array<{ key: string; doFetch: () => void }> = [];

// Generate a random session seed on page load for tile variety
const sessionSeed = Math.floor(Math.random() * 10000);

// Process the queue when a request completes
function processQueue() {
  while (requestQueue.length > 0 && activeRequestCount < MAX_CONCURRENT_REQUESTS) {
    const next = requestQueue.shift();
    if (next) {
      activeRequestCount++;
      next.doFetch();
    }
  }
}

interface CanvasState {
  cameraX: number;
  cameraY: number;
  viewportWidth: number;
  viewportHeight: number;
  tiles: Map<string, TileData>;
  query: string;
  filters: SearchFilters;
  selectedItemId: string | null;
  isDragging: boolean;
  
  // Search mode state
  isSearchMode: boolean;
  search: SearchState;

  setCamera: (x: number, y: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  setViewport: (width: number, height: number) => void;
  resetView: () => void;
  loadTile: (tileX: number, tileY: number) => Promise<void>;
  getTileData: (tileX: number, tileY: number) => TileData | undefined;
  clearTiles: () => void;
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  setSelectedItem: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  getAllVisibleItems: () => CanvasItem[];
  isAnyTileLoading: () => boolean;
  
  // Search mode actions
  performSearch: (query: string) => Promise<void>;
  loadMoreSearchResults: () => Promise<void>;
  clearSearch: () => void;
  getSearchResultsAsCanvasItems: () => CanvasItem[];
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  cameraX: 0,
  cameraY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  tiles: new Map(),
  query: "",
  filters: {},
  selectedItemId: null,
  isDragging: false,
  
  // Search mode initial state
  isSearchMode: false,
  search: {
    results: [],
    total: 0,
    loading: false,
    page: 1,
    hasMore: false,
  },

  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),

  pan: (deltaX, deltaY) =>
    set((state) => ({
      cameraX: state.cameraX + deltaX,
      cameraY: state.cameraY + deltaY,
    })),

  setViewport: (width, height) =>
    set({ viewportWidth: width, viewportHeight: height }),

  resetView: () => set({ cameraX: 0, cameraY: 0 }),

  loadTile: async (tileX, tileY) => {
    const state = get();
    const key = getTileKey(
      tileX,
      tileY,
      state.query,
      hashFilters(state.filters)
    );

    const existing = state.tiles.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (existing.loading || (existing.items.length > 0 && age < CACHE_TTL)) {
        return;
      }
    }

    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }

    // Create a promise that will be resolved when the fetch completes
    const fetchPromise = new Promise<void>((resolveOuter) => {
      const doFetch = async () => {
        set((s) => {
          const newTiles = new Map(s.tiles);
          newTiles.set(key, { items: [], loading: true, timestamp: Date.now() });
          return { tiles: newTiles };
        });

        try {
          const params = new URLSearchParams({
            tx: tileX.toString(),
            ty: tileY.toString(),
            limit: canvasConfig.ITEMS_PER_TILE.toString(),
            seed: sessionSeed.toString(),
          });

          if (state.query) {
            params.set("q", state.query);
          }

          if (Object.keys(state.filters).length > 0) {
            params.set("filters", JSON.stringify(state.filters));
          }

          const response = await fetch(`/api/tiles?${params}`);
          if (!response.ok) {
            throw new Error(`Failed to load tile: ${response.statusText}`);
          }

          const data = await response.json();
          const items = itemsToCanvasItems(data.items, tileX, tileY);

          set((s) => {
            const newTiles = new Map(s.tiles);
            newTiles.set(key, { items, loading: false, timestamp: Date.now() });
            return { tiles: newTiles };
          });
        } catch (error) {
          set((s) => {
            const newTiles = new Map(s.tiles);
            newTiles.set(key, {
              items: [],
              loading: false,
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: Date.now(),
            });
            return { tiles: newTiles };
          });
        } finally {
          activeRequestCount--;
          inFlightRequests.delete(key);
          processQueue();
          resolveOuter();
        }
      };

      // If under the limit, start immediately; otherwise queue
      if (activeRequestCount < MAX_CONCURRENT_REQUESTS) {
        activeRequestCount++;
        doFetch();
      } else {
        requestQueue.push({ key, doFetch });
      }
    });

    inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
  },

  getTileData: (tileX, tileY) => {
    const state = get();
    const key = getTileKey(
      tileX,
      tileY,
      state.query,
      hashFilters(state.filters)
    );
    return state.tiles.get(key);
  },

  clearTiles: () => {
    inFlightRequests.clear();
    requestQueue.length = 0; // Clear pending queue
    activeRequestCount = 0;
    set({ tiles: new Map() });
  },

  setQuery: (query) => {
    set({ query, cameraX: 0, cameraY: 0 }); // Reset view to center
    get().clearTiles();
  },

  setFilters: (filters) => {
    set({ filters, cameraX: 0, cameraY: 0 }); // Reset view to center
    get().clearTiles();
  },

  setSelectedItem: (id) => set({ selectedItemId: id }),
  setDragging: (isDragging) => set({ isDragging }),

  getAllVisibleItems: () => {
    const state = get();
    const allItems: CanvasItem[] = [];

    state.tiles.forEach((tileData) => {
      if (!tileData.loading && tileData.items.length > 0) {
        allItems.push(...tileData.items);
      }
    });

    return allItems;
  },

  isAnyTileLoading: () => {
    const state = get();
    for (const tileData of state.tiles.values()) {
      if (tileData.loading) return true;
    }
    return false;
  },

  // Search mode actions
  performSearch: async (query: string) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      get().clearSearch();
      return;
    }

    const currentState = get();
    
    // Skip if already searching for the same query
    if (currentState.search.loading && currentState.query === trimmedQuery) {
      return;
    }

    // Clear tiles when entering search mode
    get().clearTiles();

    set({
      query: trimmedQuery,
      isSearchMode: true,
      cameraX: 0,
      cameraY: 0,
      search: {
        results: [],
        total: 0,
        loading: true,
        page: 1,
        hasMore: false,
      },
    });

    try {
      const state = get();
      const params = new URLSearchParams({
        q: trimmedQuery,
        page: "1",
        pageSize: "100",
      });

      if (Object.keys(state.filters).length > 0) {
        params.set("filters", JSON.stringify(state.filters));
      }

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      
      set({
        search: {
          results: data.items || [],
          total: data.total || 0,
          loading: false,
          page: 1,
          hasMore: (data.items?.length || 0) < (data.total || 0),
        },
      });
    } catch (error) {
      set({
        search: {
          results: [],
          total: 0,
          loading: false,
          error: error instanceof Error ? error.message : "Search failed",
          page: 1,
          hasMore: false,
        },
      });
    }
  },

  loadMoreSearchResults: async () => {
    const state = get();
    if (!state.isSearchMode || state.search.loading || !state.search.hasMore) {
      return;
    }

    const nextPage = state.search.page + 1;

    set((s) => ({
      search: { ...s.search, loading: true },
    }));

    try {
      const params = new URLSearchParams({
        q: state.query,
        page: nextPage.toString(),
        pageSize: "100",
      });

      if (Object.keys(state.filters).length > 0) {
        params.set("filters", JSON.stringify(state.filters));
      }

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      
      set((s) => ({
        search: {
          results: [...s.search.results, ...(data.items || [])],
          total: data.total || s.search.total,
          loading: false,
          page: nextPage,
          hasMore: s.search.results.length + (data.items?.length || 0) < (data.total || 0),
        },
      }));
    } catch (error) {
      set((s) => ({
        search: {
          ...s.search,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load more",
        },
      }));
    }
  },

  clearSearch: () => {
    set({
      query: "",
      isSearchMode: false,
      cameraX: 0,
      cameraY: 0,
      search: {
        results: [],
        total: 0,
        loading: false,
        page: 1,
        hasMore: false,
      },
    });
    get().clearTiles();
  },

  getSearchResultsAsCanvasItems: () => {
    const state = get();
    if (!state.isSearchMode) return [];

    const { CARD_WIDTH, CARD_HEIGHT, CARD_GAP } = canvasConfig;
    
    // Calculate how many columns fit in the viewport (responsive)
    const viewportWidth = state.viewportWidth || 1200;
    const cardWithGap = CARD_WIDTH + CARD_GAP;
    const cols = Math.max(3, Math.floor((viewportWidth - CARD_GAP) / cardWithGap));
    
    // Calculate starting X to center the grid horizontally
    const gridWidth = cols * cardWithGap;
    const startX = Math.max(CARD_GAP, (viewportWidth - gridWidth) / 2);
    
    // Start Y below the header (with some padding)
    const startY = 80;

    // Convert search results to canvas items in a dense grid
    return state.search.results.map((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * cardWithGap;
      const y = startY + row * (CARD_HEIGHT + CARD_GAP);

      // Slight rotation for visual interest
      const seed = parseInt(item.id, 10) || index;
      const rotation = (Math.sin(seed * 12.9898) * 43758.5453 % 1 - 0.5) * 4;

      return {
        ...item,
        x,
        y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        rotation,
        tileX: 0,
        tileY: Math.floor(index / (cols * 5)),
      };
    });
  },
}));
