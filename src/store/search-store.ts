"use client";

import { create } from "zustand";
import type { SearchFilters, Facets } from "@/lib/types";

interface SearchState {
  // Query state
  query: string;
  debouncedQuery: string;
  filters: SearchFilters;

  // Facets from API
  facets: Facets | null;

  // Loading state
  isSearching: boolean;
  totalResults: number | null;

  // Actions
  setQuery: (query: string) => void;
  setDebouncedQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  toggleLanguage: (language: string) => void;
  toggleType: (type: string) => void;
  toggleCollection: (collection: string) => void;
  setYearRange: (min?: number, max?: number) => void;
  clearFilters: () => void;
  setFacets: (facets: Facets | null) => void;
  setSearching: (isSearching: boolean) => void;
  setTotalResults: (total: number | null) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  debouncedQuery: "",
  filters: {},
  facets: null,
  isSearching: false,
  totalResults: null,

  setQuery: (query) => set({ query }),

  setDebouncedQuery: (debouncedQuery) => set({ debouncedQuery }),

  setFilters: (filters) => set({ filters }),

  toggleLanguage: (language) => {
    const current = get().filters.languages || [];
    const newLanguages = current.includes(language)
      ? current.filter((l) => l !== language)
      : [...current, language];

    set({
      filters: {
        ...get().filters,
        languages: newLanguages.length > 0 ? newLanguages : undefined,
      },
    });
  },

  toggleType: (type) => {
    const current = get().filters.types || [];
    const newTypes = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];

    set({
      filters: {
        ...get().filters,
        types: newTypes.length > 0 ? newTypes : undefined,
      },
    });
  },

  toggleCollection: (collection) => {
    const current = get().filters.collections || [];
    const newCollections = current.includes(collection)
      ? current.filter((c) => c !== collection)
      : [...current, collection];

    set({
      filters: {
        ...get().filters,
        collections: newCollections.length > 0 ? newCollections : undefined,
      },
    });
  },

  setYearRange: (min, max) => {
    set({
      filters: {
        ...get().filters,
        yearMin: min,
        yearMax: max,
      },
    });
  },

  clearFilters: () => set({ filters: {} }),

  setFacets: (facets) => set({ facets }),

  setSearching: (isSearching) => set({ isSearching }),

  setTotalResults: (totalResults) => set({ totalResults }),
}));

