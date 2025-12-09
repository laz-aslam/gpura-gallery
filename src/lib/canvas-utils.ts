import { canvasConfig } from "@/config/site";
import type { ArchiveItem, CanvasItem, ViewportBounds } from "./types";

const {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_GAP,
  CULL_MARGIN,
  COLS_PER_TILE,
  ROWS_PER_TILE,
} = canvasConfig;

// Calculate tile size based on card dimensions
const TILE_WIDTH = COLS_PER_TILE * (CARD_WIDTH + CARD_GAP);
const TILE_HEIGHT = ROWS_PER_TILE * (CARD_HEIGHT + CARD_GAP);

/**
 * Seeded random for deterministic values
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generate a tile key for caching
 */
export function getTileKey(tileX: number, tileY: number, query?: string, filtersHash?: string): string {
  const base = `${tileX},${tileY}`;
  if (query || filtersHash) {
    return `${base}:${query || ""}:${filtersHash || ""}`;
  }
  return base;
}

/**
 * Calculate which tiles are visible given viewport bounds
 */
export function getVisibleTiles(
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number
): { tileX: number; tileY: number }[] {
  const worldLeft = -cameraX;
  const worldTop = -cameraY;
  const worldRight = worldLeft + viewportWidth;
  const worldBottom = worldTop + viewportHeight;

  const tileXMin = Math.floor(worldLeft / TILE_WIDTH) - 1;
  const tileXMax = Math.floor(worldRight / TILE_WIDTH) + 1;
  const tileYMin = Math.floor(worldTop / TILE_HEIGHT) - 1;
  const tileYMax = Math.floor(worldBottom / TILE_HEIGHT) + 1;

  const tiles: { tileX: number; tileY: number }[] = [];

  for (let tx = tileXMin; tx <= tileXMax; tx++) {
    for (let ty = tileYMin; ty <= tileYMax; ty++) {
      tiles.push({ tileX: tx, tileY: ty });
    }
  }

  return tiles;
}

/**
 * Calculate item position - DENSE GRID with slight tilt, no overlap
 */
export function getItemPosition(
  tileX: number,
  tileY: number,
  index: number
): { x: number; y: number; width: number; height: number; rotation: number } {
  const baseX = tileX * TILE_WIDTH;
  const baseY = tileY * TILE_HEIGHT;

  // Grid position within tile
  const col = index % COLS_PER_TILE;
  const row = Math.floor(index / COLS_PER_TILE);

  // Position with gap
  const x = baseX + col * (CARD_WIDTH + CARD_GAP) + CARD_GAP / 2;
  const y = baseY + row * (CARD_HEIGHT + CARD_GAP) + CARD_GAP / 2;

  // Seed for this specific item
  const seed = tileX * 10000 + tileY * 100 + index;

  // Slight rotation for visual interest (-3 to +3 degrees)
  const rotation = (seededRandom(seed) - 0.5) * 6;

  return {
    x,
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    rotation,
  };
}

/**
 * Convert archive items to canvas items with positioning
 */
export function itemsToCanvasItems(
  items: ArchiveItem[],
  tileX: number,
  tileY: number
): CanvasItem[] {
  return items.map((item, index) => {
    const pos = getItemPosition(tileX, tileY, index);
    return {
      ...item,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      rotation: pos.rotation,
      tileX,
      tileY,
    };
  });
}

/**
 * Get viewport bounds in world space
 */
export function getViewportBounds(
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number
): ViewportBounds {
  return {
    left: -cameraX,
    top: -cameraY,
    right: -cameraX + viewportWidth,
    bottom: -cameraY + viewportHeight,
  };
}

/**
 * Check if a canvas item is within the visible viewport (with margin)
 */
export function isItemVisible(
  item: CanvasItem,
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  const screenX = item.x + cameraX;
  const screenY = item.y + cameraY;

  return (
    screenX + item.width > -CULL_MARGIN &&
    screenX < viewportWidth + CULL_MARGIN &&
    screenY + item.height > -CULL_MARGIN &&
    screenY < viewportHeight + CULL_MARGIN
  );
}

/**
 * Filter canvas items to only those visible in viewport
 */
export function cullItems(
  items: CanvasItem[],
  cameraX: number,
  cameraY: number,
  viewportWidth: number,
  viewportHeight: number
): CanvasItem[] {
  return items.filter((item) =>
    isItemVisible(item, cameraX, cameraY, viewportWidth, viewportHeight)
  );
}

/**
 * Hash search filters for cache key
 */
export function hashFilters(filters?: {
  languages?: string[];
  types?: string[];
  collections?: string[];
  yearMin?: number;
  yearMax?: number;
}): string {
  if (!filters) return "";
  return JSON.stringify(filters);
}

// Export tile dimensions for use elsewhere
export const TILE_DIMENSIONS = { width: TILE_WIDTH, height: TILE_HEIGHT };
