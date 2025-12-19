"use client";

import { useState, useCallback, useEffect } from "react";

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  authors?: string[];
  year?: number | null;
  publisher?: string | null;
  currentPage: number;
  totalPages: number;
  itemId: string;
  sourceUrl: string;
  itemType?: string | null; // book, periodical, manuscript, etc.
}

type CitationFormat = "link" | "apa" | "mla" | "chicago" | "harvard" | "bibtex";

export function CitationModal({
  isOpen,
  onClose,
  title,
  authors,
  year,
  publisher,
  currentPage,
  totalPages,
  itemId,
  sourceUrl,
  itemType,
}: CitationModalProps) {
  const [format, setFormat] = useState<CitationFormat>("apa");
  const [includePage, setIncludePage] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reset copied state when format changes
  useEffect(() => {
    setCopied(false);
  }, [format, includePage]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const pageParam = includePage && currentPage > 1 ? `?p=${currentPage}` : "";
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${itemId}${pageParam}`;
  
  const accessDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric",
  });

  // Format author names for different citation styles
  const hasAuthors = authors && authors.length > 0;
  const authorString = hasAuthors ? authors.join(", ") : "";
  const firstAuthorParts = authors?.[0]?.split(" ") || [];
  const authorLast = firstAuthorParts.length > 0 ? firstAuthorParts[firstAuthorParts.length - 1] : "";
  const authorFirst = firstAuthorParts.length > 1 ? firstAuthorParts.slice(0, -1).join(" ") : "";
  const yearStr = year ? String(year) : "n.d.";
  const pageStr = includePage && currentPage > 0 ? `, p. ${currentPage}` : "";
  const publisherStr = publisher || "Granthappura by Indic Digital Archive Foundation";

  // Map item type to BibTeX entry type
  const getBibtexEntryType = (): string => {
    switch (itemType) {
      case "book":
        return "@book";
      case "periodical":
      case "newspaper":
        return "@article";
      case "manuscript":
        return "@unpublished";
      case "image":
      case "audio":
      case "video":
      case "map":
        return "@misc";
      default:
        return "@book"; // Default to book for Granthappura content
    }
  };

  const generateCitation = useCallback((): string => {
    switch (format) {
      case "link":
        return shareUrl;
      
      case "apa":
        // APA 7th Edition: When no author, title moves to author position
        // Author, A. A. (Year). Title. Publisher. URL
        // OR: Title. (Year). Publisher. URL
        if (hasAuthors) {
          const apaAuthor = authorFirst 
            ? `${authorLast}, ${authorFirst.charAt(0)}.` 
            : authorLast;
          return `${apaAuthor} (${yearStr}). ${title}${pageStr}. ${publisherStr}. ${shareUrl}`;
        }
        return `${title}${pageStr}. (${yearStr}). ${publisherStr}. ${shareUrl}`;
      
      case "mla":
        // MLA 9th Edition: When no author, start with title
        // Author. "Title." Publisher, Year, URL. Accessed Date.
        // OR: "Title." Publisher, Year, URL. Accessed Date.
        if (hasAuthors) {
          return `${authorString}. "${title}${pageStr}." ${publisherStr}, ${yearStr}, ${shareUrl}. Accessed ${accessDate}.`;
        }
        return `"${title}${pageStr}." ${publisherStr}, ${yearStr}, ${shareUrl}. Accessed ${accessDate}.`;
      
      case "chicago":
        // Chicago 17th: When no author, start with title
        // Author. Title. Publisher, Year. URL.
        // OR: Title. Publisher, Year. URL.
        if (hasAuthors) {
          return `${authorString}. ${title}${pageStr}. ${publisherStr}, ${yearStr}. ${shareUrl}.`;
        }
        return `${title}${pageStr}. ${publisherStr}, ${yearStr}. ${shareUrl}.`;
      
      case "harvard":
        // Harvard style: Popular in Indian universities
        // Author Surname, Initial. (Year) Title. Publisher. Available at: URL (Accessed: Day Month Year).
        const harvardDate = new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        if (hasAuthors) {
          const harvardAuthor = authorFirst 
            ? `${authorLast}, ${authorFirst.charAt(0)}.` 
            : authorLast;
          return `${harvardAuthor} (${yearStr}) ${title}${pageStr}. ${publisherStr}. Available at: ${shareUrl} (Accessed: ${harvardDate}).`;
        }
        return `${title}${pageStr} (${yearStr}) ${publisherStr}. Available at: ${shareUrl} (Accessed: ${harvardDate}).`;
      
      case "bibtex":
        // BibTeX format for LaTeX - entry type based on item type
        const bibtexType = getBibtexEntryType();
        const key = `gpura${itemId}`;
        const safeTitle = title.replace(/[{}]/g, "");
        const authorLine = hasAuthors 
          ? `  author = {${authorString.replace(/[{}]/g, "")}},\n` 
          : "";
        const pagesLine = includePage && currentPage > 0
          ? `  pages = {${currentPage}},\n`
          : "";
        return `${bibtexType}{${key},
${authorLine}  title = {${safeTitle}},
  year = {${yearStr}},
  publisher = {${publisherStr}},
${pagesLine}  url = {${shareUrl}},
  note = {Accessed: ${accessDate}}
}`;
      
      default:
        return shareUrl;
    }
  }, [format, shareUrl, title, hasAuthors, authorString, authorLast, authorFirst, yearStr, publisherStr, pageStr, includePage, currentPage, itemId, accessDate]);

  const handleCopy = async () => {
    const text = generateCitation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-HTTPS
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  const formats: { id: CitationFormat; label: string }[] = [
    { id: "apa", label: "APA" },
    { id: "mla", label: "MLA" },
    { id: "chicago", label: "Chicago" },
    { id: "harvard", label: "Harvard" },
    { id: "bibtex", label: "BibTeX" },
  ];

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.75)" }}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg rounded-2xl p-4 md:p-6 animate-modal-in"
        style={{ 
          background: "#1a1a1a", 
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Cite</h2>
            <p className="text-xs mt-0.5" style={{ color: "#666" }}>
              Generate a citation for scholarly use
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" style={{ color: "#999" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format tabs */}
        <div 
          className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto" 
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex-1 min-w-0 py-2 px-2 md:px-3 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                format === f.id 
                  ? "bg-white text-black shadow-sm" 
                  : "text-white/60 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Include page toggle */}
        {totalPages > 1 && (
          <label className="flex items-center gap-3 mb-4 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={includePage}
                onChange={(e) => setIncludePage(e.target.checked)}
                className="sr-only peer"
              />
              <div 
                className="w-10 h-6 rounded-full transition-colors peer-checked:bg-white"
                style={{ background: includePage ? "white" : "rgba(255,255,255,0.15)" }}
              />
              <div 
                className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
                style={{ 
                  background: includePage ? "#1a1a1a" : "#666",
                  transform: includePage ? "translateX(16px)" : "translateX(0)",
                }}
              />
            </div>
            <span className="text-sm group-hover:text-white transition-colors" style={{ color: "#999" }}>
              Current page <span className="opacity-60">({currentPage} of {totalPages})</span>
            </span>
          </label>
        )}

        {/* Citation output */}
        <div 
          className="p-4 rounded-xl mb-4 text-sm leading-relaxed overflow-x-auto"
          style={{ 
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#ccc",
            fontFamily: format === "bibtex" ? "ui-monospace, monospace" : "inherit",
            whiteSpace: format === "bibtex" ? "pre" : "normal",
            wordBreak: format === "bibtex" ? "normal" : "break-word",
          }}
        >
          {generateCitation()}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="w-full py-3.5 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ 
            background: copied ? "#22c55e" : "white", 
            color: copied ? "white" : "black",
          }}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied to Clipboard
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Citation
            </>
          )}
        </button>

        {/* Footer with source info */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs text-center" style={{ color: "#555" }}>
            Original source:{" "}
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="underline hover:text-white/70 transition-colors"
            >
              gpura.org
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

