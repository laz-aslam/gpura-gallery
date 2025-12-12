import { NextRequest, NextResponse } from "next/server";
import { getDataAdapter } from "@/server/adapters/DataAdapter";

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

    // Get adapter and fetch item
    const adapter = await getDataAdapter();
    const item = await adapter.getItem(id);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Item API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}



