"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { LANGUAGE_LABELS, TYPE_LABELS, TIME_RANGES } from "@/lib/types";
import type { SearchFilters } from "@/lib/types";

// Main filter categories for gpura
const LANGUAGES = ["ml", "en", "ta", "sa", "hi"] as const;
const TYPES = ["book", "periodical", "manuscript", "image", "newspaper"] as const;

type FilterCategory = "language" | "type" | "period" | null;

export function FilterBar() {
  const [activeDropdown, setActiveDropdown] = useState<FilterCategory>(null);
  const [searchInput, setSearchInput] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    filters, 
    setFilters, 
    resetView,
    query,
    isSearchMode,
    search,
    performSearch,
    clearSearch,
    isAnyTileLoading,
  } = useCanvasStore();

  // Use store's loading check - more stable than watching tiles Map
  const tilesLoading = isAnyTileLoading();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track last searched query to prevent duplicate searches
  const lastSearchedRef = useRef<string>("");
  const isSearchingRef = useRef<boolean>(false);

  // Debounced real-time search as user types - minimal dependencies
  useEffect(() => {
    const trimmed = searchInput.trim();
    
    // Skip if currently searching
    if (isSearchingRef.current) {
      return;
    }
    
    // If input is empty, clear search after delay
    if (!trimmed) {
      if (lastSearchedRef.current) {
        const timeout = setTimeout(() => {
          lastSearchedRef.current = "";
          clearSearch();
        }, 300);
        return () => clearTimeout(timeout);
      }
      return;
    }
    
    // If input has content and different from last search, trigger search
    if (trimmed !== lastSearchedRef.current) {
      const timeout = setTimeout(async () => {
        isSearchingRef.current = true;
        lastSearchedRef.current = trimmed;
        await performSearch(trimmed);
        isSearchingRef.current = false;
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [searchInput]); // Only depend on searchInput

  // Handle search submit (for Enter key - immediate search)
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      performSearch(trimmed);
    }
  }, [searchInput, performSearch]);

  // Handle clearing search
  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    lastSearchedRef.current = "";
    clearSearch();
  }, [clearSearch]);

  // Keyboard shortcut for search (press /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      if (e.key === "Escape" && isSearchMode) {
        handleClearSearch();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchMode, handleClearSearch]);

  const updateFilter = (newFilters: SearchFilters) => {
    // Reset camera FIRST so tile loading uses correct position
    resetView();
    // setFilters already calls clearTiles internally
    setFilters(newFilters);
    
    // If in search mode, re-run search with new filters
    if (isSearchMode && searchInput.trim()) {
      // Reset the ref so the search will fire again with new filters
      lastSearchedRef.current = "";
      setTimeout(() => performSearch(searchInput.trim()), 0);
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = filters.languages || [];
    const newLangs = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    updateFilter({ ...filters, languages: newLangs.length ? newLangs : undefined });
  };

  const toggleType = (type: string) => {
    const current = filters.types || [];
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateFilter({ ...filters, types: newTypes.length ? newTypes : undefined });
  };

  const togglePeriod = (label: string) => {
    const current = filters.periods || [];
    const newPeriods = current.includes(label)
      ? current.filter((p) => p !== label)
      : [...current, label];
    updateFilter({ ...filters, periods: newPeriods.length ? newPeriods : undefined });
  };

  const removePeriod = (label: string) => {
    const current = filters.periods || [];
    const newPeriods = current.filter((p) => p !== label);
    updateFilter({ ...filters, periods: newPeriods.length ? newPeriods : undefined });
  };

  const clearAllFilters = () => {
    updateFilter({});
    setActiveDropdown(null);
  };

  const hasActiveFilters = 
    (filters.languages && filters.languages.length > 0) ||
    (filters.types && filters.types.length > 0) ||
    (filters.periods && filters.periods.length > 0);

  // Get individual active filter pills
  const getActivePills = () => {
    const pills: { label: string; onRemove: () => void }[] = [];
    
    if (filters.languages?.length) {
      filters.languages.forEach(lang => {
        pills.push({
          label: LANGUAGE_LABELS[lang]?.split(" ")[0] || lang,
          onRemove: () => toggleLanguage(lang),
        });
      });
    }
    
    if (filters.types?.length) {
      filters.types.forEach(type => {
        pills.push({
          label: TYPE_LABELS[type] || type,
          onRemove: () => toggleType(type),
        });
      });
    }
    
    if (filters.periods?.length) {
      filters.periods.forEach(period => {
        pills.push({
          label: period,
          onRemove: () => removePeriod(period),
        });
      });
    }
    
    return pills;
  };

  const activePills = getActivePills();

  return (
    <div ref={dropdownRef} className="relative" style={{ transform: "translateZ(0)" }}>
      {/* Filter bar with search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.4)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search archive..."
            disabled={tilesLoading}
            className="search-input w-32 sm:w-48 focus:w-56 transition-all duration-200"
            style={{ 
              fontSize: "14px",
              opacity: tilesLoading ? 0.5 : 1,
              cursor: tilesLoading ? "not-allowed" : "text",
            }}
          />
          {isSearchMode && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* Search results count - shown right after search input */}
        {isSearchMode && !search.loading && search.total > 0 && (
          <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>
            {search.total.toLocaleString()} results
          </span>
        )}

        <div className="w-px h-4 bg-white/10 flex-shrink-0" />

        {/* Filter buttons with inline dropdowns */}
        <div className="flex items-center gap-1">
          {/* Language filter */}
          <div className="relative">
            <FilterButton
              label="Language"
              isActive={activeDropdown === "language" || (filters.languages?.length ?? 0) > 0}
              onClick={() => setActiveDropdown(activeDropdown === "language" ? null : "language")}
              disabled={search.loading}
            />
            {activeDropdown === "language" && !search.loading && (
              <Dropdown>
                {LANGUAGES.map((lang) => (
                  <DropdownItem
                    key={lang}
                    label={LANGUAGE_LABELS[lang] || lang}
                    isSelected={filters.languages?.includes(lang) || false}
                    onClick={() => toggleLanguage(lang)}
                  />
                ))}
              </Dropdown>
            )}
          </div>
          
          {/* Type filter */}
          <div className="relative">
            <FilterButton
              label="Type"
              isActive={activeDropdown === "type" || (filters.types?.length ?? 0) > 0}
              onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
              disabled={search.loading}
            />
            {activeDropdown === "type" && !search.loading && (
              <Dropdown>
                {TYPES.map((type) => (
                  <DropdownItem
                    key={type}
                    label={TYPE_LABELS[type] || type}
                    isSelected={filters.types?.includes(type) || false}
                    onClick={() => toggleType(type)}
                  />
                ))}
              </Dropdown>
            )}
          </div>
          
          {/* Period filter */}
          <div className="relative">
            <FilterButton
              label="Period"
              isActive={activeDropdown === "period" || (filters.periods?.length ?? 0) > 0}
              onClick={() => setActiveDropdown(activeDropdown === "period" ? null : "period")}
              disabled={search.loading}
            />
            {activeDropdown === "period" && !search.loading && (
              <Dropdown>
                {TIME_RANGES.map((range) => (
                  <DropdownItem
                    key={range.label}
                    label={range.label}
                    isSelected={filters.periods?.includes(range.label) || false}
                    onClick={() => togglePeriod(range.label)}
                  />
                ))}
              </Dropdown>
            )}
          </div>
        </div>

        {/* Active filter pills with horizontal scroll */}
        {hasActiveFilters && (
          <>
            <div className="w-px h-4 bg-white/10 flex-shrink-0" />
            <div 
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
              style={{ 
                maxWidth: "280px",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {activePills.map((pill, index) => (
                <button
                  key={index}
                  onClick={pill.onRemove}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap hover:bg-white/15 transition-colors flex-shrink-0"
                  style={{ 
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.8)" 
                  }}
                >
                  <span>{pill.label}</span>
                  <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
            {/* Clear all button */}
            <button
              onClick={clearAllFilters}
              className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              title="Clear all filters"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}

        {/* Loading indicator */}
        {(tilesLoading || search.loading) && (
          <>
            <div className="w-px h-4 bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  borderTopColor: "white",
                }}
              />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                {search.loading ? "Searching..." : "Loading..."}
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

function FilterButton({ 
  label, 
  isActive, 
  onClick,
  disabled = false,
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
        color: disabled 
          ? "rgba(255,255,255,0.2)" 
          : isActive 
            ? "rgba(255,255,255,0.9)" 
            : "rgba(255,255,255,0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute top-full left-0 mt-4 py-1 rounded-xl min-w-[180px] z-50"
      style={{
        background: "rgba(20,20,20,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </div>
  );
}

function DropdownItem({ 
  label, 
  isSelected, 
  onClick 
}: { 
  label: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-white/5 transition-colors"
      style={{ color: isSelected ? "white" : "rgba(255,255,255,0.7)" }}
    >
      <span>{label}</span>
      {isSelected && (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

