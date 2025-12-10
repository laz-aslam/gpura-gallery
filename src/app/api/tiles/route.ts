import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import type { SearchFilters, TileResponse } from "@/lib/types";
import { canvasConfig } from "@/config/site";

// Track in-flight background revalidations to avoid duplicates
const pendingRevalidations = new Set<string>();

// In-memory cache for tiles
const tileCache = new Map<string, { data: TileResponse; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - external API is slow, cache longer
const STALE_TTL = 60 * 60 * 1000; // 1 hour - serve stale while revalidating

// Background revalidation - doesn't block the response
async function revalidateTileInBackground(
  cacheKey: string,
  tileX: number,
  tileY: number,
  q: string | undefined,
  filters: SearchFilters | undefined,
  limit: number
) {
  // Skip if already revalidating this key
  if (pendingRevalidations.has(cacheKey)) return;
  pendingRevalidations.add(cacheKey);

  try {
    const adapter = await getDataAdapter();
    const items = await adapter.fetchTile({ tileX, tileY, q, filters, limit });
    const response: TileResponse = { tileX, tileY, items };
    tileCache.set(cacheKey, { data: response, timestamp: Date.now() });
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

    let filters: SearchFilters | undefined;
    const filtersParam = searchParams.get("filters");
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        // Ignore parse errors
      }
    }

    // Create cache key
    const cacheKey = `${tileX},${tileY}:${q || ""}:${filtersParam || ""}`;

    // Check cache - serve stale while revalidating
    const cached = tileCache.get(cacheKey);
    const now = Date.now();
    
    if (cached) {
      const age = now - cached.timestamp;
      
      // Fresh cache - serve immediately
      if (age < CACHE_TTL) {
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
            "X-Cache": "HIT",
          },
        });
      }
      
      // Stale but within grace period - serve stale and revalidate in background
      if (age < STALE_TTL) {
        // Fire-and-forget background revalidation
        revalidateTileInBackground(cacheKey, tileX, tileY, q, filters, limit);
        
        return NextResponse.json(cached.data, {
          headers: {
            "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
            "X-Cache": "STALE",
          },
        });
      }
    }

    // Fetch from adapter
    const adapter = await getDataAdapter();
    const items = await adapter.fetchTile({
      tileX,
      tileY,
      q,
      filters,
      limit,
    });

    const response: TileResponse = {
      tileX,
      tileY,
      items,
    };

    // Store in cache
    tileCache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean old cache entries periodically (expanded limit for longer TTL)
    if (tileCache.size > 500) {
      const cleanupTime = Date.now();
      for (const [key, value] of tileCache.entries()) {
        if (cleanupTime - value.timestamp > STALE_TTL) {
          tileCache.delete(key);
        }
      }
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
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
