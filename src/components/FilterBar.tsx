"use client";

import { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { LANGUAGE_LABELS, TYPE_LABELS, TIME_RANGES } from "@/lib/types";
import type { SearchFilters } from "@/lib/types";

// Main filter categories for gpura
const LANGUAGES = ["ml", "en", "ta", "sa", "hi"] as const;
const TYPES = ["book", "periodical", "manuscript", "image", "newspaper"] as const;

type FilterCategory = "language" | "type" | "period" | null;

export function FilterBar() {
  const [activeDropdown, setActiveDropdown] = useState<FilterCategory>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { filters, setFilters, clearTiles } = useCanvasStore();

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

  const updateFilter = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    clearTiles();
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
    <div ref={dropdownRef} className="relative">
      {/* Filter bar - same aesthetic as search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          <FilterButton
            label="Language"
            isActive={activeDropdown === "language" || (filters.languages?.length ?? 0) > 0}
            onClick={() => setActiveDropdown(activeDropdown === "language" ? null : "language")}
          />
          <FilterButton
            label="Type"
            isActive={activeDropdown === "type" || (filters.types?.length ?? 0) > 0}
            onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
          />
          <FilterButton
            label="Period"
            isActive={activeDropdown === "period" || (filters.periods?.length ?? 0) > 0}
            onClick={() => setActiveDropdown(activeDropdown === "period" ? null : "period")}
          />
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
      </div>

      {/* Dropdowns */}
      {activeDropdown === "language" && (
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

      {activeDropdown === "type" && (
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

      {activeDropdown === "period" && (
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
  );
}

function FilterButton({ 
  label, 
  isActive, 
  onClick 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
      style={{
        background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
        color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
      }}
    >
      {label}
    </button>
  );
}

function Dropdown({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute top-full left-0 mt-2 py-1 rounded-xl min-w-[180px] z-50"
      style={{
        background: "rgba(20,20,20,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
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

