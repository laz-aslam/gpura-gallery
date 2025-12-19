/**
 * Preloading utilities for documents (PDF and IIIF)
 */

import type { IIIFManifestData } from "./types";

// Track preloaded URLs to avoid duplicate requests
const preloadedUrls = new Set<string>();
const preloadedManifests = new Map<string, string[]>(); // manifest URL -> page URLs

/**
 * Preload an image URL in the background
 * Uses requestIdleCallback for low-priority loading
 */
export function preloadImage(url: string): void {
  if (preloadedUrls.has(url)) return;
  preloadedUrls.add(url);

  const load = () => {
    const img = new Image();
    img.src = url;
  };

  // Use requestIdleCallback if available, otherwise setTimeout
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 100);
  }
}

/**
 * Preload multiple images with staggered timing
 */
export function preloadImages(urls: string[], delayMs = 200): void {
  urls.forEach((url, index) => {
    setTimeout(() => preloadImage(url), index * delayMs);
  });
}

/**
 * Fetch and parse IIIF manifest, then preload first N pages
 */
export async function preloadIIIFManifest(
  manifestUrl: string,
  pagesToPreload = 4
): Promise<void> {
  if (preloadedManifests.has(manifestUrl)) {
    // Already parsed, just preload more pages if needed
    const pageUrls = preloadedManifests.get(manifestUrl) || [];
    preloadImages(pageUrls.slice(0, pagesToPreload));
    return;
  }

  try {
    // Use proxy to avoid CORS
    const proxyUrl = `/api/manifest?url=${encodeURIComponent(manifestUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return;

    const manifest = await response.json();
    const pageUrls = extractPageUrls(manifest);
    
    preloadedManifests.set(manifestUrl, pageUrls);
    
    // Preload first N pages
    preloadImages(pageUrls.slice(0, pagesToPreload));
  } catch {
    // Silently fail - preloading is best-effort
  }
}

/**
 * Preload adjacent pages for IIIF documents
 */
export function preloadAdjacentIIIFPages(
  manifestUrl: string,
  currentIndex: number,
  range = 2
): void {
  const pageUrls = preloadedManifests.get(manifestUrl);
  if (!pageUrls) return;

  const start = Math.max(0, currentIndex - range);
  const end = Math.min(pageUrls.length, currentIndex + range + 1);
  
  preloadImages(pageUrls.slice(start, end));
}

/**
 * Extract page image URLs from IIIF manifest
 */
function extractPageUrls(manifest: IIIFManifestData): string[] {
  const urls: string[] = [];

  // IIIF 3.0 format
  if (manifest.items && Array.isArray(manifest.items)) {
    for (const canvas of manifest.items) {
      if (canvas.type !== "Canvas") continue;
      const body = canvas.items?.[0]?.items?.[0]?.body;
      if (body?.id) {
        // Request a reasonable size for preloading
        let imageUrl = body.id;
        if (imageUrl.includes("/full/") || imageUrl.includes("/max/")) {
          imageUrl = imageUrl.replace(/\/max\/|\/full\/|\/\d+,\d+\/|\/,\d+\/|\/\d+,\//, "/,1200/");
        }
        urls.push(imageUrl);
      }
    }
  }

  // IIIF 2.x format
  if (manifest.sequences && Array.isArray(manifest.sequences)) {
    const sequence = manifest.sequences[0];
    if (sequence?.canvases) {
      for (const canvas of sequence.canvases) {
        const resource = canvas.images?.[0]?.resource;
        if (resource?.["@id"]) {
          let imageUrl = resource["@id"];
          if (imageUrl.includes("/full/") || imageUrl.includes("/max/")) {
            imageUrl = imageUrl.replace(/\/max\/|\/full\/|\/\d+,\d+\/|\/,\d+\/|\/\d+,\//, "/,1200/");
          }
          urls.push(imageUrl);
        }
      }
    }
  }

  return urls;
}

/**
 * Clear preload cache (useful for memory management)
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
  preloadedManifests.clear();
}

