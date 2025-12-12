import { NextRequest, NextResponse } from "next/server";

/**
 * PDF Proxy API - fetches PDFs from external sources and serves them
 * This bypasses CORS restrictions so react-pdf can render them
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    // Validate URL
    const pdfUrl = new URL(url);
    
    // Only allow PDFs from trusted domains
    const allowedDomains = [
      "gpura.org",
      "www.gpura.org",
      "keraladigitalarchive.org",
      "artifacts.keraladigitalarchive.org",
      "kerala-digital-archive.sgp1.digitaloceanspaces.com",
      "digitaloceanspaces.com",
    ];
    
    if (!allowedDomains.some(domain => pdfUrl.hostname.endsWith(domain))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    // Fetch the PDF
    const response = await fetch(url, {
      headers: {
        "Accept": "application/pdf",
        "User-Agent": "gpura-gallery/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the PDF data
    const pdfData = await response.arrayBuffer();

    // Return the PDF with proper headers
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdfData.byteLength.toString(),
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}

