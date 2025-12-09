"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasItemCard } from "./CanvasItemCard";
import { getVisibleTiles, cullItems, TILE_DIMENSIONS, getTileKey, hashFilters } from "@/lib/canvas-utils";

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const momentumRef = useRef<number | null>(null);
  const tileLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    cameraX,
    cameraY,
    viewportWidth,
    viewportHeight,
    isDragging,
    filters,
    setCamera,
    pan,
    setViewport,
    setDragging,
    loadTile,
    getAllVisibleItems,
    setSelectedItem,
    tiles,
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

    let hasLoading = false;

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

    const filtersHash = hashFilters(filters);
    sortedTiles.forEach(({ tileX, tileY }) => {
      const key = getTileKey(tileX, tileY, "", filtersHash);
      const tileData = tiles.get(key);
      if (tileData?.loading) hasLoading = true;
      loadTile(tileX, tileY);
    });

    setIsLoading(hasLoading);
  }, [cameraX, cameraY, viewportWidth, viewportHeight, loadTile, tiles, filters]);

  // Initial load when viewport becomes ready
  useEffect(() => {
    if (viewportWidth > 0 && viewportHeight > 0) {
      loadVisibleTiles();
    }
  }, [viewportWidth > 0, viewportHeight > 0, loadVisibleTiles]);

  // Load tiles with debounce during movement, or immediately when filters change
  useEffect(() => {
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
  }, [cameraX, cameraY, isDragging, loadVisibleTiles, filters]);

  // Cull items to visible
  const visibleItems = useMemo(() => {
    const allItems = getAllVisibleItems();
    return cullItems(
      allItems,
      cameraX,
      cameraY,
      viewportWidth,
      viewportHeight
    );
  }, [getAllVisibleItems, cameraX, cameraY, viewportWidth, viewportHeight]);

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

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-3 py-1.5 rounded-full text-xs flex items-center gap-2"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 animate-spin"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                borderTopColor: "white",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Loading...</span>
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
