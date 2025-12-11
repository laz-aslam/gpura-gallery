import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import type { SearchFilters, SearchResponse } from "@/lib/types";

// In-memory cache for search results
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for search results

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Parse filters if provided
    let filters: SearchFilters | undefined;
    const filtersParam = searchParams.get("filters");
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch {
        // Ignore parse errors
      }
    }

    // Allow filter-only queries (for getting count) or search queries
    const hasFilters = filters && Object.keys(filters).some(k => {
      const val = filters[k as keyof SearchFilters];
      return val !== undefined && (Array.isArray(val) ? val.length > 0 : true);
    });
    
    if (!q.trim() && !hasFilters) {
      return NextResponse.json(
        { items: [], total: 0, facets: {} },
        { status: 200 }
      );
    }

    // Create cache key
    const cacheKey = `${q}:${page}:${pageSize}:${filtersParam || ""}`;

    // Check cache
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, max-age=300",
          "X-Cache": "HIT",
        },
      });
    }

    // Fetch from adapter
    const adapter = await getDataAdapter();
    const response = await adapter.search({
      q,
      filters,
      page,
      pageSize,
    });

    // Store in cache
    searchCache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean old cache entries
    if (searchCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          searchCache.delete(key);
        }
      }
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search items", items: [], total: 0 },
      { status: 500 }
    );
  }
}
