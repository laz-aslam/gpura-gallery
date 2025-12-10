"use client";

import { create } from "zustand";
import type { IIIFPage, DocumentSource } from "@/lib/types";

interface ViewerState {
  isOpen: boolean;
  documentSource: DocumentSource | null;
  title: string;
  pages: IIIFPage[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  openViewer: (source: DocumentSource, title: string) => void;
  closeViewer: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (index: number) => void;
  setPages: (pages: IIIFPage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  isOpen: false,
  documentSource: null,
  title: "",
  pages: [],
  currentIndex: 0,
  loading: false,
  error: null,

  openViewer: (source, title) => {
    set({
      isOpen: true,
      documentSource: source,
      title,
      pages: [],
      currentIndex: 0,
      loading: source.type === "iiif", // Only load for IIIF, PDF loads directly
      error: null,
    });
  },

  closeViewer: () => {
    set({
      isOpen: false,
      documentSource: null,
      title: "",
      pages: [],
      currentIndex: 0,
      loading: false,
      error: null,
    });
  },

  nextPage: () => {
    const { currentIndex, pages } = get();
    if (currentIndex < pages.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prevPage: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  goToPage: (index) => {
    const { pages } = get();
    if (index >= 0 && index < pages.length) {
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
}));
