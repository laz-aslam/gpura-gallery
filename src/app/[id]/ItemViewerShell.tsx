"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useViewerStore } from "@/store/viewer-store";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { ItemDetail } from "@/lib/types";

export function ItemViewerShell({
  item,
  initialPage,
}: {
  item: ItemDetail;
  initialPage: number;
}) {
  const router = useRouter();
  const { openViewer, setCurrentIndex, goToPage, isOpen, pages } = useViewerStore();
  const hasOpenedRef = useRef(false);
  const hasNavigatedToPageRef = useRef(false);

  useEffect(() => {
    if (item.documentSource && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      openViewer(item.documentSource, item.title, item.sourceUrl, {
        authors: item.authors,
        year: item.year,
        publisher: item.publisher,
        itemId: item.id,
        itemType: item.type,
      });

      if (initialPage > 0) {
        setCurrentIndex(initialPage);
      }
    }
  }, [initialPage, item, openViewer, setCurrentIndex]);

  useEffect(() => {
    if (initialPage > 0 && isOpen && pages.length > 0 && !hasNavigatedToPageRef.current) {
      hasNavigatedToPageRef.current = true;
      goToPage(Math.min(initialPage, pages.length - 1));
    }
  }, [goToPage, initialPage, isOpen, pages.length]);

  if (!item.documentSource) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center"
          style={{ background: "#0a0a0a" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                borderTopColor: "white",
              }}
            />
            <p className="text-sm" style={{ color: "#666" }}>
              Loading reader...
            </p>
          </div>
        </div>
      )}
      <DocumentViewer onClose={() => router.push("/")} />
    </>
  );
}
