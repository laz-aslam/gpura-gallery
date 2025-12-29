import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import { getCache, CACHE_TTL, CACHE_HEADERS } from "@/lib/cache";
import type { SearchFilters, TileResponse } from "@/lib/types";
import { canvasConfig } from "@/config/site";

// Track in-flight background revalidations to avoid duplicates
const pendingRevalidations = new Set<string>();

// In-memory cache for tiles
const tileCache = getCache<TileResponse>("tiles");

// Background revalidation - doesn't block the response
async function revalidateTileInBackground(
  cacheKey: string,
  tileX: number,
  tileY: number,
  q: string | undefined,
  filters: SearchFilters | undefined,
  limit: number,
  seed: number
) {
  // Skip if already revalidating this key
  if (pendingRevalidations.has(cacheKey)) return;
  pendingRevalidations.add(cacheKey);

  try {
    const adapter = await getDataAdapter();
    const items = await adapter.fetchTile({ tileX, tileY, q, filters, limit, seed });
    const response: TileResponse = { tileX, tileY, items };
    tileCache.set(cacheKey, response);
  } catch (error) {
    console.error("Background revalidation failed:", error);
  } finally {
    pendingRevalidations.delete(cacheKey);
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const txParam = searchParams.get("tx");
    const tyParam = searchParams.get("ty");

    if (txParam === null || tyParam === null) {
      return NextResponse.json(
        { error: "Missing tile coordinates (tx, ty)" },
        { status: 400 }
      );
    }

    const tileX = parseInt(txParam, 10);
    const tileY = parseInt(tyParam, 10);

    if (isNaN(tileX) || isNaN(tileY)) {
      return NextResponse.json(
        { error: "Invalid tile coordinates" },
        { status: 400 }
      );
    }

    const q = searchParams.get("q") || undefined;
    const limit = parseInt(
      searchParams.get("limit") || String(canvasConfig.ITEMS_PER_TILE),
      10
    );
    const seed = parseInt(searchParams.get("seed") || "0", 10);

    let filters: SearchFilters | undefined;
    const filtersParam = searchParams.get("filters");
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        // Ignore parse errors
      }
    }

    // Create cache key - include seed for per-session variety
    const cacheKey = `${tileX},${tileY}:${q || ""}:${filtersParam || ""}:${seed}`;

    // Check cache - serve stale while revalidating
    const cached = tileCache.getStale(cacheKey, CACHE_TTL.DEFAULT, CACHE_TTL.STALE);
    
    if (cached) {
      // If stale, trigger background revalidation
      if (cached.isStale) {
        revalidateTileInBackground(cacheKey, tileX, tileY, q, filters, limit, seed);
      }
      
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": CACHE_HEADERS.DEFAULT,
          "X-Cache": cached.isStale ? "STALE" : "HIT",
        },
      });
    }

    // Fetch from adapter
    const adapter = await getDataAdapter();
    const items = await adapter.fetchTile({
      tileX,
      tileY,
      q,
      filters,
      limit,
      seed,
    });

    const response: TileResponse = {
      tileX,
      tileY,
      items,
    };

    // Store in cache
    tileCache.set(cacheKey, response);
    tileCache.cleanup(CACHE_TTL.STALE, 1000);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": CACHE_HEADERS.DEFAULT,
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Tiles API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tile items" },
      { status: 500 }
    );
  }
}
