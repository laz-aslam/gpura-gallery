import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import type { SearchFilters } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const q = searchParams.get("q") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "40", 10);

    // Parse filters
    const filters: SearchFilters = {};

    const languages = searchParams.get("languages");
    if (languages) {
      filters.languages = languages.split(",").filter(Boolean);
    }

    const types = searchParams.get("types");
    if (types) {
      filters.types = types.split(",").filter(Boolean);
    }

    const collections = searchParams.get("collections");
    if (collections) {
      filters.collections = collections.split(",").filter(Boolean);
    }

    const yearMin = searchParams.get("yearMin");
    if (yearMin) {
      filters.yearMin = parseInt(yearMin, 10);
    }

    const yearMax = searchParams.get("yearMax");
    if (yearMax) {
      filters.yearMax = parseInt(yearMax, 10);
    }

    // Get adapter and perform search
    const adapter = await getDataAdapter();
    const response = await adapter.search({
      q,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      page,
      pageSize,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search items" },
      { status: 500 }
    );
  }
}

