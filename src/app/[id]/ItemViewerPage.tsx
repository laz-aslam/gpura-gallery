"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useViewerStore } from "@/store/viewer-store";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { ItemDetail } from "@/lib/types";

interface ItemViewerPageProps {
  item: ItemDetail;
  initialPage: number;
}

export function ItemViewerPage({ item, initialPage }: ItemViewerPageProps) {
  const router = useRouter();
  const { openViewer, setCurrentIndex, goToPage, isOpen, pages } = useViewerStore();
  const hasOpenedRef = useRef(false);
  const hasNavigatedToPageRef = useRef(false);

  // Open viewer on mount (only once)
  useEffect(() => {
    if (item.documentSource && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      openViewer(item.documentSource, item.title, item.sourceUrl);
      // Set initial page index immediately (for PDFs that don't wait for pages array)
      if (initialPage > 0) {
        setCurrentIndex(initialPage);
      }
    }
  }, [item, openViewer, initialPage, setCurrentIndex]);

  // Navigate to initial page once pages are loaded (for IIIF documents)
  useEffect(() => {
    if (initialPage > 0 && isOpen && pages.length > 0 && !hasNavigatedToPageRef.current) {
      hasNavigatedToPageRef.current = true;
      // Clamp to valid page range
      const targetPage = Math.min(initialPage, pages.length - 1);
      goToPage(targetPage);
    }
  }, [initialPage, isOpen, pages.length, goToPage]);

  // Handle close - navigate back to main gallery
  const handleClose = () => {
    router.push("/");
  };

  // If no viewable content, show info card
  if (!item.documentSource) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{ background: "#0a0a0a" }}
      >
        {/* Thumbnail */}
        {item.thumbnailUrl && (
          <div 
            className="w-48 h-64 mb-6 rounded-lg overflow-hidden"
            style={{ background: "#141414" }}
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-xl font-medium text-center mb-2 max-w-md">
          {item.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 text-sm mb-6" style={{ color: "#666" }}>
          {item.year && <span>{item.year}</span>}
          {item.year && item.type && <span>·</span>}
          {item.type && <span className="capitalize">{item.type}</span>}
        </div>

        <p className="text-sm mb-8 text-center max-w-sm" style={{ color: "#888" }}>
          This item doesn&apos;t have a viewable document in the reader.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "white", color: "black" }}
          >
            View on gpura.org
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ 
              background: "transparent", 
              color: "#999",
              border: "1px solid rgba(255,255,255,0.15)" 
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Explore Gallery
          </button>
        </div>
      </div>
    );
  }

  return <DocumentViewer onClose={handleClose} />;
}

