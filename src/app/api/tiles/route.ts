import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import type { SearchFilters, TileResponse } from "@/lib/types";
import { canvasConfig } from "@/config/site";

// In-memory cache for tiles
const tileCache = new Map<string, { data: TileResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // Check cache
    const cached = tileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
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
    });

    const response: TileResponse = {
      tileX,
      tileY,
      items,
    };

    // Store in cache
    tileCache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (tileCache.size > 200) {
      const now = Date.now();
      for (const [key, value] of tileCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          tileCache.delete(key);
        }
      }
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
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
