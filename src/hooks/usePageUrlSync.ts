"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Syncs the current page to the browser URL without triggering navigation.
 * This allows the URL to always reflect the current page for sharing.
 * 
 * @param currentPage - Current page number (1-indexed)
 * @param isActive - Whether the sync should be active (e.g., viewer is open)
 */
export function usePageUrlSync(currentPage: number, isActive: boolean) {
  const pathname = usePathname();
  const lastPageRef = useRef(currentPage);
  const [isMounted, setIsMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !isActive || currentPage === lastPageRef.current) return;
    lastPageRef.current = currentPage;

    // Get current search params from window.location (client-side only)
    const currentParams = new URLSearchParams(window.location.search);
    
    if (currentPage > 1) {
      currentParams.set("p", String(currentPage));
    } else {
      currentParams.delete("p"); // Remove param for page 1 (cleaner URL)
    }

    const newUrl = currentParams.toString() 
      ? `${pathname}?${currentParams.toString()}`
      : pathname;

    // Update URL without navigation (preserves scroll, state, etc.)
    window.history.replaceState(null, "", newUrl);
  }, [currentPage, isActive, pathname, isMounted]);
}
