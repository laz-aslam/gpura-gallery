import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import { getCache, CACHE_TTL, CACHE_HEADERS } from "@/lib/cache";
import type { ItemDetail } from "@/lib/types";

// In-memory cache for item details
const itemCache = getCache<ItemDetail>("items");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing item ID" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = itemCache.get(id, CACHE_TTL.DEFAULT);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": CACHE_HEADERS.DEFAULT,
          "X-Cache": "HIT",
        },
      });
    }

    // Get adapter and fetch item
    const adapter = await getDataAdapter();
    const item = await adapter.getItem(id);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Store in cache
    itemCache.set(id, item);
    itemCache.cleanup(CACHE_TTL.DEFAULT);

    return NextResponse.json(item, {
      headers: {
        "Cache-Control": CACHE_HEADERS.DEFAULT,
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Item API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}
