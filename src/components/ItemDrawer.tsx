"use client";

import { useEffect, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useViewerStore } from "@/store/viewer-store";
import type { ItemDetail } from "@/lib/types";

export function ItemDrawer() {
  const { selectedItemId, setSelectedItem } = useCanvasStore();
  const openViewer = useViewerStore((s) => s.openViewer);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Check if item has viewable content (IIIF manifest or PDF)
  const hasViewableContent = !!item?.documentSource;

  // Open document viewer
  const handleReadDocument = useCallback(() => {
    if (item?.documentSource) {
      openViewer(item.documentSource, item.title);
    }
  }, [item, openViewer]);

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

  // Close drawer
  const handleClose = useCallback(() => {
    setSelectedItem(null);
  }, [setSelectedItem]);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-animate"
        style={{ background: "rgba(0,0,0,0.8)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 drawer-animate overflow-hidden flex flex-col"
        style={{ background: "#0a0a0a" }}
        role="dialog"
        aria-modal="true"
        aria-label="Item details"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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
                  className="relative w-full aspect-3/4"
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
                <h2 className="text-xl font-medium leading-tight">
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
          <div className="p-6 pt-0 space-y-3">
            {/* Primary CTA: Read Document (if IIIF manifest exists) */}
            {hasViewableContent && (
              <button
                onClick={handleReadDocument}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "white",
                  color: "black",
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>Read Document</span>
              </button>
            )}

            {/* Secondary CTA: View on gpura.org */}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] ${
                hasViewableContent ? "" : ""
              }`}
              style={
                hasViewableContent
                  ? {
                      background: "transparent",
                      color: "#999",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }
                  : {
                      background: "white",
                      color: "black",
                    }
              }
            >
              <span>View on gpura.org</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </>
  );
}
