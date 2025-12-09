"use client";

import { useState, memo, useCallback } from "react";
import type { CanvasItem } from "@/lib/types";

interface CanvasItemCardProps {
  item: CanvasItem;
  onClick: () => void;
}

function CanvasItemCardComponent({ item, onClick }: CanvasItemCardProps) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");

  const handleLoad = useCallback(() => setImageState("loaded"), []);
  const handleError = useCallback(() => setImageState("error"), []);

  return (
    <div
      className="canvas-card"
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View ${item.title}`}
    >
      {/* Loading skeleton */}
      {imageState === "loading" && (
        <div
          className="absolute inset-0"
          style={{ 
            background: "linear-gradient(135deg, #1a1a1a 0%, #252525 50%, #1a1a1a 100%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Error state */}
      {imageState === "error" && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "#1a1a1a" }}
        >
          <svg
            className="w-8 h-8 opacity-20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
      )}

      {/* Image */}
      {item.thumbnailUrl && imageState !== "error" && (
        <img
          src={item.thumbnailUrl}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            imageState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}

      {/* Hover overlay with title */}
      <div className="card-overlay">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2">
          {item.title}
        </p>
        {item.year && (
          <p className="text-white/60 text-[10px] mt-1">{item.year}</p>
        )}
      </div>
    </div>
  );
}

export const CanvasItemCard = memo(CanvasItemCardComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.x === next.item.x &&
    prev.item.y === next.item.y &&
    prev.item.thumbnailUrl === next.item.thumbnailUrl
  );
});
