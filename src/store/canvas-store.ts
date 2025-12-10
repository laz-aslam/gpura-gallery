"use client";

import { create } from "zustand";
import { canvasConfig } from "@/config/site";
import type { CanvasItem, SearchFilters } from "@/lib/types";
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

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - match server cache
const MAX_CONCURRENT_REQUESTS = 6; // Limit concurrent fetches
const inFlightRequests = new Map<string, Promise<void>>();
let activeRequestCount = 0; // Track actual in-flight requests separately
const requestQueue: Array<{ key: string; doFetch: () => void }> = [];

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
    set({ query });
    get().clearTiles();
  },

  setFilters: (filters) => {
    set({ filters });
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
}));
