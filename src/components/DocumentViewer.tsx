"use client";

import { useEffect, useState, useCallback } from "react";
import { useViewerStore } from "@/store/viewer-store";
import type { IIIFPage } from "@/lib/types";

/**
 * Parse IIIF 3.0 manifest to extract pages
 */
function parseIIIFManifest(manifest: IIIFManifestData): IIIFPage[] {
  const pages: IIIFPage[] = [];
  
  // IIIF 3.0 format
  if (manifest.items && Array.isArray(manifest.items)) {
    for (const canvas of manifest.items) {
      if (canvas.type !== "Canvas") continue;
      
      // Get image from annotations
      const annoPage = canvas.items?.[0];
      const annotation = annoPage?.items?.[0];
      const body = annotation?.body;
      
      if (body?.id) {
        // Get a reasonable size image (not full resolution)
        // IIIF Image API: {base}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
        let imageUrl = body.id;
        
        // If it's a full IIIF Image API URL, request a smaller size
        if (imageUrl.includes("/full/") || imageUrl.includes("/max/")) {
          // Replace size parameter with a reasonable width
          imageUrl = imageUrl.replace(/\/max\/|\/full\/|\/\d+,\d+\/|\/,\d+\/|\/\d+,\//, "/,1200/");
        }
        
        pages.push({
          id: canvas.id || String(pages.length),
          label: extractLabel(canvas.label),
          imageUrl,
          width: canvas.width || body.width || 1000,
          height: canvas.height || body.height || 1400,
        });
      }
    }
  }
  
  // IIIF 2.x format (sequences)
  if (manifest.sequences && Array.isArray(manifest.sequences)) {
    const sequence = manifest.sequences[0];
    if (sequence?.canvases) {
      for (const canvas of sequence.canvases) {
        const image = canvas.images?.[0];
        const resource = image?.resource;
        
        if (resource?.["@id"]) {
          let imageUrl = resource["@id"];
          
          // Request smaller size if possible
          if (imageUrl.includes("/full/") || imageUrl.includes("/max/")) {
            imageUrl = imageUrl.replace(/\/max\/|\/full\/|\/\d+,\d+\/|\/,\d+\/|\/\d+,\//, "/,1200/");
          }
          
          pages.push({
            id: canvas["@id"] || String(pages.length),
            label: extractLabel(canvas.label) || `Page ${pages.length + 1}`,
            imageUrl,
            width: canvas.width || 1000,
            height: canvas.height || 1400,
          });
        }
      }
    }
  }
  
  return pages;
}

/**
 * Extract label from IIIF label object
 */
function extractLabel(label: unknown): string | undefined {
  if (!label) return undefined;
  if (typeof label === "string") return label;
  if (typeof label === "object") {
    // IIIF 3.0 format: { "en": ["Label"] }
    const values = Object.values(label as Record<string, string[]>);
    if (values.length > 0 && Array.isArray(values[0])) {
      return values[0][0];
    }
  }
  return undefined;
}

// Types for IIIF manifest parsing
interface IIIFManifestData {
  items?: IIIFCanvas[];
  sequences?: IIIFSequence[];
  [key: string]: unknown;
}

interface IIIFCanvas {
  id?: string;
  "@id"?: string;
  type?: string;
  label?: unknown;
  width?: number;
  height?: number;
  items?: IIIFAnnotationPage[];
  images?: IIIFImage[];
}

interface IIIFAnnotationPage {
  items?: IIIFAnnotation[];
}

interface IIIFAnnotation {
  body?: IIIFBody;
}

interface IIIFBody {
  id?: string;
  width?: number;
  height?: number;
}

interface IIIFSequence {
  canvases?: IIIFCanvas[];
}

interface IIIFImage {
  resource?: {
    "@id"?: string;
  };
}

export function DocumentViewer() {
  const {
    isOpen,
    documentSource,
    title,
    sourceUrl,
    pages,
    currentIndex,
    loading,
    error,
    closeViewer,
    nextPage,
    prevPage,
    setPages,
    setError,
  } = useViewerStore();

  const [imageLoading, setImageLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true);

  const currentPage = pages[currentIndex];
  const hasMultiple = pages.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  const isPdf = documentSource?.type === "pdf";
  const isIiif = documentSource?.type === "iiif";

  // Fetch and parse IIIF manifest via proxy to avoid CORS
  useEffect(() => {
    if (!isOpen || !documentSource || documentSource.type !== "iiif") return;

    const fetchManifest = async () => {
      try {
        // Use proxy endpoint to avoid CORS issues
        const proxyUrl = `/api/manifest?url=${encodeURIComponent(documentSource.url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to load manifest: ${response.status}`);
        }
        
        const manifest = await response.json();
        const parsedPages = parseIIIFManifest(manifest);
        
        if (parsedPages.length === 0) {
          throw new Error("No viewable pages found in document");
        }
        
        setPages(parsedPages);
      } catch (err) {
        console.error("Error loading manifest:", err);
        setError(err instanceof Error ? err.message : "Failed to load document");
      }
    };

    fetchManifest();
  }, [isOpen, documentSource, setPages, setError]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeViewer();
          break;
        case "ArrowLeft":
          if (hasPrev && isIiif) prevPage();
          break;
        case "ArrowRight":
          if (hasNext && isIiif) nextPage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrev, hasNext, isIiif, closeViewer, prevPage, nextPage]);

  // Reset image loading state when page changes
  useEffect(() => {
    setImageLoading(true);
  }, [currentIndex]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handlePdfLoad = useCallback(() => {
    setPdfLoading(false);
  }, []);

  if (!isOpen || !documentSource) return null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        {/* Title and page info */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={closeViewer}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
            aria-label="Close viewer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm hidden sm:block">Back</span>
          </button>
          
          <div className="min-w-0">
            <h1 className="text-sm font-medium truncate max-w-[200px] sm:max-w-md">
              {title}
            </h1>
            {isIiif && pages.length > 0 && (
              <p className="text-xs" style={{ color: "#666" }}>
                Page {currentIndex + 1} of {pages.length}
              </p>
            )}
            {isPdf && (
              <p className="text-xs" style={{ color: "#666" }}>
                PDF Document
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Open on gpura.org */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10"
              style={{ color: "#999" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span className="hidden sm:block">Open in gpura.org</span>
            </a>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading state for IIIF manifest */}
        {loading && isIiif && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0a0a0a" }}>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  borderTopColor: "white",
                }}
              />
              <p className="text-sm" style={{ color: "#666" }}>Loading document...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0a0a0a" }}>
            <div className="flex flex-col items-center gap-4 text-center p-8">
              <svg className="w-12 h-12" style={{ color: "#444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium mb-1">Unable to load document</p>
                <p className="text-sm" style={{ color: "#666" }}>
                  {error}
                </p>
              </div>
              <button
                onClick={closeViewer}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                style={{ background: "white", color: "black" }}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* PDF Viewer - using Google Docs Viewer for online viewing */}
        {isPdf && !error && (
          <>
            {pdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0a0a0a" }}>
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 animate-spin"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      borderTopColor: "white",
                    }}
                  />
                  <p className="text-sm" style={{ color: "#666" }}>Loading PDF...</p>
                </div>
              </div>
            )}
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentSource.url)}&embedded=true`}
              className="w-full h-full border-0"
              title={title}
              onLoad={handlePdfLoad}
            />
          </>
        )}

        {/* IIIF Page image */}
        {isIiif && currentPage && !loading && !error && (
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            {/* Image loading spinner */}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    borderTopColor: "white",
                  }}
                />
              </div>
            )}
            <img
              key={currentPage.imageUrl}
              src={currentPage.imageUrl}
              alt={currentPage.label || `Page ${currentIndex + 1}`}
              className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
          </div>
        )}

        {/* Navigation arrows for multiple IIIF pages */}
        {isIiif && hasMultiple && !loading && !error && (
          <>
            {/* Previous */}
            <button
              onClick={prevPage}
              disabled={!hasPrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                hasPrev ? "hover:bg-white/20 hover:scale-110" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.5)" }}
              aria-label="Previous page"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next */}
            <button
              onClick={nextPage}
              disabled={!hasNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                hasNext ? "hover:bg-white/20 hover:scale-110" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.5)" }}
              aria-label="Next page"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Bottom navigation bar for IIIF */}
      {isIiif && pages.length > 0 && !loading && !error && (
        <div
          className="flex items-center justify-center gap-4 px-4 py-3 border-t shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={prevPage}
            disabled={!hasPrev}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              hasPrev ? "hover:bg-white/10" : "opacity-30 cursor-not-allowed"
            }`}
          >
            Previous
          </button>
          
          {/* Page input for quick navigation */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentIndex + 1}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (page >= 1 && page <= pages.length) {
                  useViewerStore.getState().goToPage(page - 1);
                }
              }}
              className="w-16 px-2 py-1 rounded text-center text-sm tabular-nums"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <span className="text-sm" style={{ color: "#666" }}>
              / {pages.length}
            </span>
          </div>
          
          <button
            onClick={nextPage}
            disabled={!hasNext}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              hasNext ? "hover:bg-white/10" : "opacity-30 cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
