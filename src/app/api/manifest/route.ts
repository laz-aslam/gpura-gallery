import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy endpoint to fetch IIIF manifests (avoids CORS issues)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing manifest URL" },
      { status: 400 }
    );
  }

  // Validate URL is from allowed domains
  const allowedDomains = [
    "artifacts.keraladigitalarchive.org",
    "iiif.gpura.org",
    "gpura.org",
  ];

  try {
    const parsedUrl = new URL(url);
    if (!allowedDomains.some((domain) => parsedUrl.hostname.endsWith(domain))) {
      return NextResponse.json(
        { error: "URL not allowed" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 3600, // Cache for 1 hour
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch manifest: ${response.status}` },
        { status: response.status }
      );
    }

    const manifest = await response.json();

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Manifest proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifest" },
      { status: 500 }
    );
  }
}



