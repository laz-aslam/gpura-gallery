"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasItemCard } from "./CanvasItemCard";
import { getVisibleTiles, cullItems, TILE_DIMENSIONS, repackItemsToGrid, hasActiveFilters } from "@/lib/canvas-utils";

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const momentumRef = useRef<number | null>(null);
  const tileLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    cameraX,
    cameraY,
    viewportWidth,
    viewportHeight,
    isDragging,
    filters,
    tiles,
    setCamera,
    pan,
    setViewport,
    setDragging,
    loadTile,
    getAllVisibleItems,
    setSelectedItem,
    isSearchMode,
    search,
    getSearchResultsAsCanvasItems,
    loadMoreSearchResults,
  } = useCanvasStore();

  // Handle viewport resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setViewport(rect.width, rect.height);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [setViewport]);

  // Debounced tile loading
  const loadVisibleTiles = useCallback(() => {
    if (viewportWidth === 0 || viewportHeight === 0) return;

    const visibleTiles = getVisibleTiles(
      cameraX,
      cameraY,
      viewportWidth,
      viewportHeight
    );

    // Load center tiles first
    const centerX = -cameraX + viewportWidth / 2;
    const centerY = -cameraY + viewportHeight / 2;

    const sortedTiles = visibleTiles.sort((a, b) => {
      const distA = Math.abs(a.tileX * TILE_DIMENSIONS.width - centerX) + 
                    Math.abs(a.tileY * TILE_DIMENSIONS.height - centerY);
      const distB = Math.abs(b.tileX * TILE_DIMENSIONS.width - centerX) + 
                    Math.abs(b.tileY * TILE_DIMENSIONS.height - centerY);
      return distA - distB;
    });

    sortedTiles.forEach(({ tileX, tileY }) => {
      loadTile(tileX, tileY);
    });
  }, [cameraX, cameraY, viewportWidth, viewportHeight, loadTile]);

  // Initial load when viewport becomes ready (skip in search mode)
  useEffect(() => {
    if (viewportWidth > 0 && viewportHeight > 0 && !isSearchMode) {
      loadVisibleTiles();
    }
  }, [viewportWidth > 0, viewportHeight > 0, loadVisibleTiles, isSearchMode]);

  // Load tiles with debounce during movement, or immediately when filters change
  // Skip tile loading in search mode
  useEffect(() => {
    if (isSearchMode) return;

    if (tileLoadTimeoutRef.current) {
      clearTimeout(tileLoadTimeoutRef.current);
    }

    if (isDragging) {
      tileLoadTimeoutRef.current = setTimeout(loadVisibleTiles, 150);
    } else {
      // Load immediately when not dragging (including filter changes)
      loadVisibleTiles();
    }

    return () => {
      if (tileLoadTimeoutRef.current) {
        clearTimeout(tileLoadTimeoutRef.current);
      }
    };
  }, [cameraX, cameraY, isDragging, loadVisibleTiles, filters, isSearchMode]);

  // Load more search results when scrolling down
  useEffect(() => {
    if (!isSearchMode || !search.hasMore || search.loading) return;

    // Check if user has scrolled near the bottom of current results
    const searchItems = getSearchResultsAsCanvasItems();
    if (searchItems.length === 0) return;

    const lastItem = searchItems[searchItems.length - 1];
    const bottomOfContent = lastItem.y + lastItem.height;
    const viewBottom = -cameraY + viewportHeight;

    // Load more when within 500px of the bottom
    if (viewBottom > bottomOfContent - 500) {
      loadMoreSearchResults();
    }
  }, [cameraY, viewportHeight, isSearchMode, search.hasMore, search.loading, getSearchResultsAsCanvasItems, loadMoreSearchResults]);

  // Collect and process items - use search results when in search mode
  const visibleItems = useMemo(() => {
    // In search mode, use search results in a dense grid
    if (isSearchMode) {
      const searchItems = getSearchResultsAsCanvasItems();
      return cullItems(
        searchItems,
        cameraX,
        cameraY,
        viewportWidth,
        viewportHeight
      );
    }

    // Collect all items from loaded tiles
    const allItems = getAllVisibleItems();
    
    // When filters are active, repack items into a dense grid
    const shouldRepack = hasActiveFilters(filters);
    const processedItems = shouldRepack ? repackItemsToGrid(allItems) : allItems;
    
    // Cull to only visible items
    return cullItems(
      processedItems,
      cameraX,
      cameraY,
      viewportWidth,
      viewportHeight
    );
  }, [getAllVisibleItems, getSearchResultsAsCanvasItems, isSearchMode, cameraX, cameraY, viewportWidth, viewportHeight, tiles, filters, search.results]);

  // Momentum animation
  const animateMomentum = useCallback(() => {
    const friction = 0.92;
    const minVelocity = 0.3;

    velocityRef.current.x *= friction;
    velocityRef.current.y *= friction;

    if (
      Math.abs(velocityRef.current.x) > minVelocity ||
      Math.abs(velocityRef.current.y) > minVelocity
    ) {
      pan(velocityRef.current.x, velocityRef.current.y);
      momentumRef.current = requestAnimationFrame(animateMomentum);
    } else {
      momentumRef.current = null;
    }
  }, [pan]);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
        momentumRef.current = null;
      }

      setDragging(true);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = performance.now();
      velocityRef.current = { x: 0, y: 0 };

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setDragging]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !lastPointerRef.current) return;

      const now = performance.now();
      const dt = now - lastTimeRef.current;

      const deltaX = e.clientX - lastPointerRef.current.x;
      const deltaY = e.clientY - lastPointerRef.current.y;

      if (dt > 0) {
        velocityRef.current = {
          x: deltaX * 0.6 + velocityRef.current.x * 0.4,
          y: deltaY * 0.6 + velocityRef.current.y * 0.4,
        };
      }

      pan(deltaX, deltaY);

      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;
    },
    [isDragging, pan]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setDragging(false);
      lastPointerRef.current = null;

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (
        Math.abs(velocityRef.current.x) > 1.5 ||
        Math.abs(velocityRef.current.y) > 1.5
      ) {
        momentumRef.current = requestAnimationFrame(animateMomentum);
      }
    },
    [setDragging, animateMomentum]
  );

  // Handle wheel - pan only (no zoom)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
        momentumRef.current = null;
      }

      // Pan with scroll
      const panSpeed = 1.2;
      const panX = e.shiftKey ? -e.deltaY * panSpeed : -e.deltaX * panSpeed;
      const panY = e.shiftKey ? 0 : -e.deltaY * panSpeed;
      pan(panX, panY);
    },
    [pan]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (itemId: string) => {
      if (!isDragging) {
        setSelectedItem(itemId);
      }
    },
    [isDragging, setSelectedItem]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
      if (tileLoadTimeoutRef.current) {
        clearTimeout(tileLoadTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${
        isDragging ? "canvas-grabbing" : "canvas-grab"
      }`}
      style={{ background: "#0a0a0a" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      role="application"
      aria-label="Infinite canvas - drag to pan"
    >
      {/* Canvas layer */}
      <div
        className="absolute will-change-transform"
        style={{
          transform: `translate3d(${cameraX}px, ${cameraY}px, 0)`,
        }}
      >
        {visibleItems.map((item) => (
          <CanvasItemCard
            key={item.id}
            item={item}
            onClick={() => handleCardClick(item.id)}
          />
        ))}
      </div>

      {/* Search empty state */}
      {isSearchMode && !search.loading && search.results.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
              No results found
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Try a different search term
            </p>
          </div>
        </div>
      )}

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </div>
  );
}
