"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { useCanvasStore } from "@/store/canvas-store";
import { useViewerStore } from "@/store/viewer-store";
import { useDeviceType } from "@/hooks/useDeviceType";
import { preloadIIIFManifest } from "@/lib/preload";
import type { ItemDetail } from "@/lib/types";

export function ItemDrawer() {
  const { selectedItemId, setSelectedItem } = useCanvasStore();
  const openViewer = useViewerStore((s) => s.openViewer);
  const { isMobile } = useDeviceType();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if item has viewable content (IIIF manifest or PDF)
  const hasViewableContent = !!item?.documentSource;

  // Open document viewer
  const handleReadDocument = useCallback(() => {
    if (item?.documentSource) {
      openViewer(
        item.documentSource, 
        item.title, 
        item.sourceUrl,
        {
          authors: item.authors,
          year: item.year,
          publisher: item.publisher,
          itemId: item.id,
          itemType: item.type,
        }
      );
    }
  }, [item, openViewer]);

  // Close drawer with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before removing
    setTimeout(() => {
      setSelectedItem(null);
      setDragOffset(0);
      setIsClosing(false);
    }, 450);
  }, [setSelectedItem]);

  // Check if content is scrolled to top
  const isScrolledToTop = useCallback(() => {
    if (!contentRef.current) return true;
    return contentRef.current.scrollTop <= 5; // Small threshold for tolerance
  }, []);

  // Swipe gesture for mobile - swipe right to close (or down on mobile)
  const bind = useDrag(
    ({ active, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], cancel, first }) => {
      // Use horizontal swipe on desktop, vertical on mobile
      const movement = isMobile ? my : mx;
      const velocity = isMobile ? vy : vx;
      const direction = isMobile ? dy : dx;

      // On mobile, only allow close gesture if scrolled to top
      if (isMobile && first && movement > 0 && !isScrolledToTop()) {
        cancel();
        return;
      }

      if (active) {
        setIsDragging(true);
        // Only allow dragging in the close direction (right on desktop, down on mobile)
        if (movement > 0) {
          setDragOffset(movement);
        }
      } else {
        setIsDragging(false);
        // Close if dragged far enough or with enough velocity
        const threshold = isMobile ? 150 : 100;
        const velocityThreshold = 0.5;

        if (movement > threshold || (velocity > velocityThreshold && direction > 0)) {
          handleClose();
        } else {
          setDragOffset(0);
        }
      }
    },
    {
      axis: isMobile ? "y" : "x",
      filterTaps: true,
      from: () => [0, 0],
      bounds: { top: 0, left: 0 },
      rubberband: true,
    }
  );

  // Fetch item details when selected
  useEffect(() => {
    if (!selectedItemId) {
      setItem(null);
      return;
    }

    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      setImageLoaded(false);

      try {
        const response = await fetch(`/api/item/${selectedItemId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Item not found");
          } else {
            throw new Error("Failed to fetch item");
          }
          return;
        }
        const data = await response.json();
        setItem(data);
      } catch (err) {
        console.error("Error fetching item:", err);
        setError(err instanceof Error ? err.message : "Failed to load item");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [selectedItemId]);

  // Preload first pages when item with viewable content is loaded
  useEffect(() => {
    if (!item?.documentSource) return;

    // Preload IIIF manifest and first 4 pages
    if (item.documentSource.type === "iiif") {
      // Small delay to not interfere with drawer animation
      const timer = setTimeout(() => {
        preloadIIIFManifest(item.documentSource!.url, 4);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // For PDFs, we can't easily preload pages without loading the whole PDF
    // The PDF viewer will handle its own preloading
  }, [item?.documentSource]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedItemId) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, handleClose]);

  if (!selectedItemId) return null;

  // Calculate transform based on drag or closing state
  const getTransform = () => {
    if (isClosing) {
      // Animate fully off-screen
      return isMobile ? "translateY(100%)" : "translateX(100%)";
    }
    if (isMobile) {
      return `translateY(${dragOffset}px)`;
    }
    return `translateX(${dragOffset}px)`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-animate"
        style={{
          background: "rgba(0,0,0,0.8)",
          opacity: isClosing ? 0 : Math.max(0, 1 - dragOffset / 300),
          transition: isClosing ? "opacity 400ms ease-out" : "none",
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        {...bind()}
        className={`fixed z-50 overflow-hidden flex flex-col ${
          isMobile
            ? "inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]"
            : "right-0 top-0 bottom-0 w-full max-w-md"
        }`}
        style={{
          background: "#0a0a0a",
          transform: getTransform(),
          touchAction: "pan-y",
          transition: !isDragging || isClosing 
            ? "transform 450ms cubic-bezier(0.16, 1, 0.3, 1)" 
            : "none",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Item details"
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}

        {/* Close button - desktop only */}
        {!isMobile && (
          <button
            onClick={handleClose}
            className="absolute z-10 top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.1)" }}
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto drawer-scroll">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  borderTopColor: "white",
                }}
              />
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p style={{ color: "#666" }}>{error}</p>
            </div>
          )}

          {item && !loading && (
            <>
              {/* Large image - use full resolution when available */}
              {(item.fullImageUrl || item.thumbnailUrl) && (
                <div
                  className={`relative w-full ${isMobile ? "aspect-[4/3]" : "aspect-3/4"}`}
                  style={{ background: "#141414" }}
                >
                  {!imageLoaded && (
                    <div
                      className="absolute inset-0 animate-pulse"
                      style={{ background: "#1a1a1a" }}
                    />
                  )}
                  <img
                    src={item.fullImageUrl ?? item.thumbnailUrl ?? undefined}
                    alt={item.title}
                    className={`w-full h-full object-contain transition-opacity duration-300 ${
                      imageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              )}

              {/* Info */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <h2 className={`font-medium leading-tight ${isMobile ? "text-lg" : "text-xl"}`}>
                  {item.title}
                </h2>

                {/* Meta row */}
                <div className="flex flex-wrap gap-2 text-sm" style={{ color: "#666" }}>
                  {item.year && <span>{item.year}</span>}
                  {item.year && item.type && <span>·</span>}
                  {item.type && <span className="capitalize">{item.type}</span>}
                  {(item.year || item.type) && item.language && <span>·</span>}
                  {item.language && <span className="uppercase">{item.language}</span>}
                </div>

                {/* Authors */}
                {item.authors && item.authors.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#444" }}>
                      Author
                    </p>
                    <p style={{ color: "#999" }}>{item.authors.join(", ")}</p>
                  </div>
                )}

                {/* Collection */}
                {item.collection && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#444" }}>
                      Collection
                    </p>
                    <p style={{ color: "#999" }}>{item.collection}</p>
                  </div>
                )}

                {/* Description */}
                {item.description && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#444" }}>
                      About
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#999" }}>
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer with CTAs */}
        {item && !loading && (
          <div
            className={`p-6 space-y-3 ${isMobile ? "pt-4 safe-area-bottom" : "pt-0"}`}
            style={isMobile ? { boxShadow: "0 -12px 24px -12px rgba(0,0,0,0.8)" } : undefined}
          >
            {/* Mobile: gpura.org first, then Read Document */}
            {isMobile ? (
              <>
                {/* View on gpura.org */}
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
                  style={{
                    background: "transparent",
                    color: "#999",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <span>View on gpura.org</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                {/* Read Document (if IIIF manifest exists) */}
                {hasViewableContent && (
                  <button
                    onClick={handleReadDocument}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
                    style={{ background: "white", color: "black" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Read Document</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Desktop: Read Document first (primary), then gpura.org */}
                {hasViewableContent && (
                  <button
                    onClick={handleReadDocument}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "white", color: "black" }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Read Document</span>
                  </button>
                )}

                {/* View on gpura.org */}
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02]"
                  style={
                    hasViewableContent
                      ? { background: "transparent", color: "#999", border: "1px solid rgba(255,255,255,0.15)" }
                      : { background: "white", color: "black" }
                  }
                >
                  <span>View on gpura.org</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}
