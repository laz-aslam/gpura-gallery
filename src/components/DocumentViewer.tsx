"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { useViewerStore } from "@/store/viewer-store";
import { useDeviceType } from "@/hooks/useDeviceType";
import { usePageUrlSync } from "@/hooks/usePageUrlSync";
import { CitationModal } from "./CitationModal";
import type {
  IIIFPage,
  IIIFManifestData,
  IIIFCanvas,
  IIIFSequence,
} from "@/lib/types";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with react-pdf
const PdfViewer = dynamic(
  () => import("./PdfViewer").then((mod) => mod.PdfViewer),
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "white" }} />
          <p className="text-sm" style={{ color: "#666" }}>Loading viewer...</p>
        </div>
      </div>
    )
  }
);

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

interface DocumentViewerProps {
  onClose?: () => void;
}

export function DocumentViewer({ onClose }: DocumentViewerProps = {}) {
  const {
    isOpen,
    documentSource,
    title,
    sourceUrl,
    pages,
    currentIndex,
    loading,
    error,
    viewMode,
    closeViewer,
    nextPage,
    prevPage,
    setPages,
    setError,
    setViewMode,
    // Citation metadata
    authors,
    year,
    publisher,
    itemId,
    itemType,
  } = useViewerStore();

  const { isMobile, isTouch } = useDeviceType();
  const [imageLoading, setImageLoading] = useState(true);
  const [secondImageLoading, setSecondImageLoading] = useState(true);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingPage, setIsSwipingPage] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync current page to browser URL for shareable links
  usePageUrlSync(currentIndex + 1, isOpen);

  // Handle close with optional custom handler
  const handleClose = useCallback(() => {
    closeViewer();
    onClose?.();
  }, [closeViewer, onClose]);

  // Copy text to clipboard with fallback for mobile
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to legacy method
      }
    }
    
    // Legacy fallback using execCommand (works better on some mobile browsers)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  }, []);

  // Share current page link
  const handleShare = useCallback(async () => {
    // Extract item ID from sourceUrl
    const match = sourceUrl?.match(/\/item\/(\d+)/);
    const extractedItemId = match?.[1];
    
    if (!extractedItemId) return;
    
    // Build share URL with optional page parameter
    const pageParam = currentIndex > 0 ? `?p=${currentIndex + 1}` : "";
    const shareUrl = `${window.location.origin}/${extractedItemId}${pageParam}`;
    
    const success = await copyToClipboard(shareUrl);
    
    if (success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    } else if (!isMobile) {
      // Desktop fallback - show prompt
      window.prompt("Copy this link:", shareUrl);
    } else {
      // Mobile - show toast anyway (user can manually copy if needed)
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    }
  }, [sourceUrl, currentIndex, isMobile, copyToClipboard]);

  const currentPage = pages[currentIndex];
  const secondPage = viewMode === "double" && currentIndex + 1 < pages.length ? pages[currentIndex + 1] : null;
  const hasMultiple = pages.length > 1;
  const hasPrev = currentIndex > 0;
  const hasNext = viewMode === "double" 
    ? currentIndex + 1 < pages.length - 1  // In double mode, check if there's at least one more page after the pair
    : currentIndex < pages.length - 1;

  const isPdf = documentSource?.type === "pdf";
  const isIiif = documentSource?.type === "iiif";

  // Swipe gesture for page navigation (touch devices)
  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], cancel }) => {
      if (!isIiif || !hasMultiple || loading) return;

      if (active) {
        setIsSwipingPage(true);
        // Limit swipe based on available pages
        const limitedMx = !hasPrev && mx > 0 ? mx * 0.3 : !hasNext && mx < 0 ? mx * 0.3 : mx;
        setSwipeOffset(limitedMx);
      } else {
        setIsSwipingPage(false);
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

  // Keyboard navigation (PDF has its own keyboard handling in PdfViewer)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          handleClose();
          break;
        case "ArrowLeft":
          if (isIiif && hasPrev) prevPage();
          break;
        case "ArrowRight":
          if (isIiif && hasNext) nextPage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrev, hasNext, isIiif, handleClose, prevPage, nextPage]);

  // Reset image loading state when page changes
  useEffect(() => {
    setImageLoading(true);
    setSecondImageLoading(true);
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

  const handleSecondImageLoad = useCallback(() => {
    setSecondImageLoading(false);
  }, []);

  const handleSecondImageError = useCallback(() => {
    setSecondImageLoading(false);
  }, []);

  if (!isOpen || !documentSource) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header
        className={`flex items-center justify-between border-b shrink-0 ${
          isMobile ? "px-3 py-2 safe-area-inset" : "px-4 py-3"
        }`}
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        {/* Title and page info */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <button
            onClick={handleClose}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10 active:scale-95"
            aria-label="Close viewer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm hidden sm:block">Back</span>
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className={`font-medium truncate ${isMobile ? "text-xs max-w-[150px]" : "text-sm max-w-md"}`}>
              {title}
            </h1>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Cite button - opens citation modal (desktop only) */}
          {sourceUrl && itemId && !isMobile && (
            <button
              onClick={() => setShowCiteModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10 active:scale-95"
              style={{ color: "#999" }}
              aria-label="Cite this page"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z"/>
              </svg>
              <span>Cite</span>
            </button>
          )}

          {/* Copy Link button - quick copy */}
          {sourceUrl && (
            <button
              onClick={handleShare}
              className="relative flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10 active:scale-95"
              style={{ color: showCopied && !isMobile ? "#fff" : "#999" }}
              aria-label="Copy link"
            >
              {/* Mobile: always show link icon */}
              {isMobile ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              ) : showCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
          )}

          {/* Open on gpura.org */}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10 active:scale-95"
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
              <span className="hidden md:block">gpura.org</span>
            </a>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" {...(isTouch && isIiif ? bind() : {})}>
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
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                style={{ background: "white", color: "black" }}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* PDF Viewer - custom viewer with page/book modes like IIIF */}
        {isPdf && !error && (
          <PdfViewer
            url={documentSource.url}
            isMobile={isMobile}
            isTouch={isTouch}
            sourceUrl={sourceUrl}
            initialPage={currentIndex + 1}
          />
        )}

        {/* IIIF Page image with swipe support */}
        {isIiif && currentPage && !loading && !error && (
          <div
            className={`w-full h-full flex items-center justify-center p-2 md:p-4 overflow-auto ${
              viewMode === "double" && !isMobile ? "gap-2 md:gap-4" : ""
            }`}
            style={{
              transform: `translateX(${swipeOffset}px)`,
              transition: isSwipingPage ? "none" : "transform 0.2s ease-out",
            }}
          >
            {/* Image loading spinner */}
            {(imageLoading || (viewMode === "double" && secondPage && secondImageLoading)) && (
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
            
            {/* First/Left page */}
            <img
              key={currentPage.imageUrl}
              src={currentPage.imageUrl}
              alt={currentPage.label || `Page ${currentIndex + 1}`}
              className={`object-contain transition-opacity duration-200 ${
                imageLoading ? "opacity-0" : "opacity-100"
              } ${viewMode === "double" && !isMobile ? "max-w-[48%] max-h-full" : "max-w-full max-h-full"}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
            />
            
            {/* Second/Right page (only in double mode on desktop) */}
            {viewMode === "double" && !isMobile && secondPage && (
              <img
                key={secondPage.imageUrl}
                src={secondPage.imageUrl}
                alt={secondPage.label || `Page ${currentIndex + 2}`}
                className={`max-w-[48%] max-h-full object-contain transition-opacity duration-200 ${
                  secondImageLoading ? "opacity-0" : "opacity-100"
                }`}
                onLoad={handleSecondImageLoad}
                onError={handleSecondImageError}
                draggable={false}
              />
            )}
          </div>
        )}

        {/* Navigation arrows - desktop only or tablet in landscape */}
        {isIiif && hasMultiple && !loading && !error && !isMobile && (
          <>
            {/* Previous */}
            <button
              onClick={prevPage}
              disabled={!hasPrev}
              className={`absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                hasPrev ? "hover:bg-white/20 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.5)" }}
              aria-label="Previous page"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next */}
            <button
              onClick={nextPage}
              disabled={!hasNext}
              className={`absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                hasNext ? "hover:bg-white/20 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
              }`}
              style={{ background: "rgba(0,0,0,0.5)" }}
              aria-label="Next page"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}


        {/* Edge tap zones for mobile page navigation */}
        {isTouch && isIiif && hasMultiple && !loading && !error && (
          <>
            {/* Left tap zone */}
            {hasPrev && (
              <button
                onClick={prevPage}
                className="absolute left-0 top-0 bottom-0 w-16 md:hidden"
                style={{ background: "transparent" }}
                aria-label="Previous page"
              />
            )}
            {/* Right tap zone */}
            {hasNext && (
              <button
                onClick={nextPage}
                className="absolute right-0 top-0 bottom-0 w-16 md:hidden"
                style={{ background: "transparent" }}
                aria-label="Next page"
              />
            )}
          </>
        )}
      </div>

      {/* Bottom navigation bar for IIIF - redesigned for mobile */}
      {isIiif && pages.length > 0 && !loading && !error && (
        <div
          className={`flex items-center justify-center border-t shrink-0 ${
            isMobile ? "gap-2 px-3 py-2 safe-area-bottom" : "gap-4 px-4 py-3"
          }`}
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          {/* Compact navigation for mobile */}
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

              {/* Page indicator */}
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm font-medium tabular-nums">{currentIndex + 1}</span>
                <span className="text-sm" style={{ color: "#666" }}>/</span>
                <span className="text-sm tabular-nums" style={{ color: "#666" }}>{pages.length}</span>
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
              
              {/* Divider */}
              <div className="w-px h-6 mx-2" style={{ background: "rgba(255,255,255,0.15)" }} />
              
              {/* View mode toggle */}
              <div
                className="flex items-center rounded-lg p-0.5"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <button
                  onClick={() => setViewMode("single")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "single"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white/80"
                  }`}
                  title="Page view"
                >
                  {/* Single page icon */}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="3" width="12" height="18" rx="1" strokeWidth={1.5} />
                  </svg>
                  <span className="hidden lg:inline">Page</span>
                </button>
                <button
                  onClick={() => setViewMode("double")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "double"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white/80"
                  }`}
                  title="Book view"
                >
                  {/* Book icon */}
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

      {/* Mobile toast for copy confirmation */}
      {isMobile && showCopied && (
        <div 
          className="fixed bottom-24 left-0 right-0 z-[110] flex justify-center pointer-events-none"
        >
          <div 
            className="px-4 py-2.5 rounded-full text-sm font-medium animate-fade-in-up"
            style={{ 
              background: "rgba(255,255,255,0.95)",
              color: "#000",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
          >
            Link Copied
          </div>
        </div>
      )}

      {/* Citation Modal */}
      <CitationModal
        isOpen={showCiteModal}
        onClose={() => setShowCiteModal(false)}
        title={title}
        authors={authors}
        year={year}
        publisher={publisher}
        currentPage={currentIndex + 1}
        totalPages={pages.length || 1}
        itemId={itemId || ""}
        sourceUrl={sourceUrl || ""}
        itemType={itemType}
      />

    </div>
  );
}
