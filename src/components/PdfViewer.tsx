"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDrag } from "@use-gesture/react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ViewMode = "single" | "double";

interface PdfViewerProps {
  url: string;
  isMobile: boolean;
  isTouch: boolean;
  sourceUrl?: string | null;
}

export function PdfViewer({ url, isMobile, isTouch }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [pageRatio, setPageRatio] = useState(1.4); // Default A4-ish ratio (height/width)
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Proxy URL to bypass CORS
  const proxyUrl = `/api/pdf?url=${encodeURIComponent(url)}`;

  // Calculate page dimensions to fit within container
  const getPageWidth = useCallback(() => {
    const { width: containerWidth, height: containerHeight } = containerSize;
    // Account for padding (p-4 = 16px on each side)
    const availableHeight = containerHeight - 32;
    const availableWidth = containerWidth - 32;
    
    if (viewMode === "double" && !isMobile) {
      // In double mode, each page takes about half the width (gap-4 = 16px gap)
      const maxWidthPerPage = (availableWidth - 16) / 2;
      const heightConstrainedWidth = availableHeight / pageRatio;
      return Math.min(maxWidthPerPage, heightConstrainedWidth);
    }
    
    // Single mode - fit to container respecting both width and height
    const heightConstrainedWidth = availableHeight / pageRatio;
    return Math.min(availableWidth, heightConstrainedWidth);
  }, [viewMode, isMobile, containerSize, pageRatio]);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Navigation
  const hasPrev = currentPage > 1;
  const hasNext = viewMode === "double" && !isMobile
    ? currentPage + 1 < (numPages || 0)
    : currentPage < (numPages || 0);

  const nextPage = useCallback(() => {
    if (!numPages) return;
    const step = viewMode === "double" && !isMobile ? 2 : 1;
    setCurrentPage((p) => Math.min(p + step, numPages));
    setPageLoading(true);
  }, [numPages, viewMode, isMobile]);

  const prevPage = useCallback(() => {
    const step = viewMode === "double" && !isMobile ? 2 : 1;
    setCurrentPage((p) => Math.max(p - step, 1));
    setPageLoading(true);
  }, [viewMode, isMobile]);

  const goToPage = useCallback((page: number) => {
    if (numPages && page >= 1 && page <= numPages) {
      setCurrentPage(page);
      setPageLoading(true);
    }
  }, [numPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) prevPage();
      if (e.key === "ArrowRight" && hasNext) nextPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrev, hasNext, prevPage, nextPage]);

  // Swipe gesture for page navigation (touch devices)
  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!numPages || numPages <= 1 || loading) return;

      if (active) {
        setIsSwiping(true);
        // Limit swipe based on available pages (rubber band effect at edges)
        const limitedMx = !hasPrev && mx > 0 ? mx * 0.3 : !hasNext && mx < 0 ? mx * 0.3 : mx;
        setSwipeOffset(limitedMx);
      } else {
        setIsSwiping(false);
        const threshold = 80;
        const velocityThreshold = 0.3;

        if ((mx < -threshold || (vx > velocityThreshold && dx < 0)) && hasNext) {
          nextPage();
        } else if ((mx > threshold || (vx > velocityThreshold && dx > 0)) && hasPrev) {
          prevPage();
        }
        setSwipeOffset(0);
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  // PDF load handlers
  const onDocumentLoadSuccess = useCallback(({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error("PDF load error:", err);
    setLoading(false);
    setError("Failed to load PDF");
  }, []);

  const onPageLoadSuccess = useCallback(({ width, height }: { width: number; height: number }) => {
    setPageLoading(false);
    // Update page ratio based on actual page dimensions
    if (width && height) {
      setPageRatio(height / width);
    }
  }, []);

  // Second page in double view
  const secondPageNum = viewMode === "double" && !isMobile && numPages && currentPage + 1 <= numPages
    ? currentPage + 1
    : null;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Main content */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
      >
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0a0a0a" }}>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "white" }}
              />
              <p className="text-sm" style={{ color: "#666" }}>Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0a0a0a" }}>
            <div className="flex flex-col items-center gap-5 text-center p-8 max-w-md">
              <svg className="w-12 h-12" style={{ color: "#444" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium mb-1 text-white">Unable to load PDF</p>
                <p className="text-sm" style={{ color: "#666" }}>{error}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02]"
                style={{ background: "white", color: "black" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Open PDF</span>
              </a>
            </div>
          </div>
        )}

        {/* PDF Pages */}
        {!error && (
          <div 
            {...(isTouch ? bind() : {})}
            className="h-full flex items-center justify-center p-4 touch-pan-y"
            style={{
              transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
              transition: isSwiping ? "none" : "transform 0.3s ease-out",
            }}
          >
            <Document
              file={proxyUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className={`flex ${viewMode === "double" && !isMobile ? "gap-4" : ""}`}
            >
              {/* Page loading indicator */}
              {pageLoading && !loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div
                    className="w-6 h-6 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "white" }}
                  />
                </div>
              )}

              {/* Main page */}
              <Page
                pageNumber={currentPage}
                width={getPageWidth()}
                onLoadSuccess={onPageLoadSuccess}
                loading={null}
                renderTextLayer={!isMobile}
                renderAnnotationLayer={!isMobile}
                className="shadow-2xl rounded overflow-hidden"
              />

              {/* Second page in double mode */}
              {secondPageNum && (
                <Page
                  pageNumber={secondPageNum}
                  width={getPageWidth()}
                  loading={null}
                  renderTextLayer={!isMobile}
                  renderAnnotationLayer={!isMobile}
                  className="shadow-2xl rounded overflow-hidden"
                />
              )}
            </Document>
          </div>
        )}

        {/* Navigation arrows - desktop */}
        {numPages && numPages > 1 && !isMobile && !error && (
          <>
            <button
              onClick={prevPage}
              disabled={!hasPrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all z-20 ${
                hasPrev ? "hover:bg-white/20 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.7)" }}
              aria-label="Previous page"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextPage}
              disabled={!hasNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all z-20 ${
                hasNext ? "hover:bg-white/20 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.7)" }}
              aria-label="Next page"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

      </div>

      {/* Bottom navigation bar */}
      {numPages && !error && (
        <div
          className={`flex items-center justify-center border-t shrink-0 ${
            isMobile ? "gap-2 px-3 py-2 safe-area-bottom" : "gap-4 px-4 py-3"
          }`}
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          {isMobile ? (
            <>
              <button
                onClick={prevPage}
                disabled={!hasPrev}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  hasPrev ? "active:scale-95" : "opacity-30"
                }`}
                style={{ background: hasPrev ? "rgba(255,255,255,0.1)" : "transparent" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2 px-3">
                <span className="text-sm font-medium tabular-nums">{currentPage}</span>
                <span className="text-sm" style={{ color: "#666" }}>/</span>
                <span className="text-sm tabular-nums" style={{ color: "#666" }}>{numPages}</span>
              </div>

              <button
                onClick={nextPage}
                disabled={!hasNext}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  hasNext ? "active:scale-95" : "opacity-30"
                }`}
                style={{ background: hasNext ? "rgba(255,255,255,0.1)" : "transparent" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={prevPage}
                disabled={!hasPrev}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  hasPrev ? "hover:bg-white/10" : "opacity-30 cursor-not-allowed"
                }`}
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value, 10);
                    if (!isNaN(page)) goToPage(page);
                  }}
                  className="w-16 px-2 py-1 rounded text-center text-sm tabular-nums"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <span className="text-sm" style={{ color: "#666" }}>/ {numPages}</span>
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

              <div className="w-px h-6 mx-2" style={{ background: "rgba(255,255,255,0.15)" }} />

              {/* View mode toggle */}
              <div className="flex items-center rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                <button
                  onClick={() => setViewMode("single")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "single" ? "bg-white/20 text-white" : "text-white/60 hover:text-white/80"
                  }`}
                  title="Page view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="3" width="12" height="18" rx="1" strokeWidth={1.5} />
                  </svg>
                  <span className="hidden lg:inline">Page</span>
                </button>
                <button
                  onClick={() => setViewMode("double")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "double" ? "bg-white/20 text-white" : "text-white/60 hover:text-white/80"
                  }`}
                  title="Book view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="3" width="9" height="18" rx="1" strokeWidth={1.5} />
                    <rect x="13" y="3" width="9" height="18" rx="1" strokeWidth={1.5} />
                  </svg>
                  <span className="hidden lg:inline">Book</span>
                </button>
              </div>

            </>
          )}
        </div>
      )}
    </div>
  );
}
