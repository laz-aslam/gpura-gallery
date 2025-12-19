"use client";

import { create } from "zustand";
import type { IIIFPage, DocumentSource } from "@/lib/types";

export type ViewMode = "single" | "double";

/**
 * Metadata for citation generation
 */
interface CitationMetadata {
  authors?: string[];
  year?: number | null;
  publisher?: string | null;
  itemId?: string;
  itemType?: string | null; // book, periodical, manuscript, etc.
}

interface ViewerState {
  isOpen: boolean;
  documentSource: DocumentSource | null;
  title: string;
  sourceUrl: string | null;
  pages: IIIFPage[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  
  // Citation metadata
  authors?: string[];
  year?: number | null;
  publisher?: string | null;
  itemId?: string;
  itemType?: string | null;
  
  // Actions
  openViewer: (source: DocumentSource, title: string, sourceUrl?: string, metadata?: CitationMetadata) => void;
  closeViewer: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (index: number) => void;
  setCurrentIndex: (index: number) => void;
  setPages: (pages: IIIFPage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  isOpen: false,
  documentSource: null,
  title: "",
  sourceUrl: null,
  pages: [],
  currentIndex: 0,
  loading: false,
  error: null,
  viewMode: "single",
  // Citation metadata
  authors: undefined,
  year: null,
  publisher: null,
  itemId: undefined,
  itemType: null,

  openViewer: (source, title, sourceUrl, metadata) => {
    set({
      isOpen: true,
      documentSource: source,
      title,
      sourceUrl: sourceUrl || null,
      pages: [],
      currentIndex: 0,
      loading: source.type === "iiif", // Only load for IIIF, PDF loads directly
      error: null,
      // Citation metadata
      authors: metadata?.authors,
      year: metadata?.year,
      publisher: metadata?.publisher,
      itemId: metadata?.itemId,
      itemType: metadata?.itemType,
    });
  },

  closeViewer: () => {
    set({
      isOpen: false,
      documentSource: null,
      title: "",
      sourceUrl: null,
      pages: [],
      currentIndex: 0,
      loading: false,
      error: null,
      // Reset citation metadata
      authors: undefined,
      year: null,
      publisher: null,
      itemId: undefined,
      itemType: null,
    });
  },

  nextPage: () => {
    const { currentIndex, pages, viewMode } = get();
    const step = viewMode === "double" ? 2 : 1;
    const newIndex = Math.min(currentIndex + step, pages.length - 1);
    if (newIndex !== currentIndex) {
      set({ currentIndex: newIndex });
    }
  },

  prevPage: () => {
    const { currentIndex, viewMode } = get();
    const step = viewMode === "double" ? 2 : 1;
    const newIndex = Math.max(currentIndex - step, 0);
    if (newIndex !== currentIndex) {
      set({ currentIndex: newIndex });
    }
  },

  goToPage: (index) => {
    const { pages } = get();
    if (index >= 0 && index < pages.length) {
      set({ currentIndex: index });
    }
  },

  setCurrentIndex: (index) => {
    if (index >= 0) {
      set({ currentIndex: index });
    }
  },

  setPages: (pages) => {
    set({ pages, loading: false });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error, loading: false });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
}));
