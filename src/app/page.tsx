"use client";

import { InfiniteCanvas } from "@/components/InfiniteCanvas";
import { FilterBar } from "@/components/FilterBar";
import { ItemDrawer } from "@/components/ItemDrawer";
import { DocumentViewer } from "@/components/DocumentViewer";
import { InfoButton } from "@/components/InfoButton";
import { siteConfig } from "@/config/site";

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden relative">
      {/* Full-screen infinite canvas */}
      <InfiniteCanvas />

      {/* Floating header */}
      <header className="fixed top-0 left-0 right-0 z-30 p-4 flex items-center justify-between pointer-events-none">
        {/* Logo */}
        <a
          href={siteConfig.links.classicSite}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo.svg"
            alt="Granthapura Infinite Gallery"
            className="h-7"
          />
        </a>

        {/* Center filters */}
        <div className="pointer-events-auto">
          <FilterBar />
        </div>

        {/* Right side links */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-full pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label="GitHub"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
          </a>
          <a
            href={siteConfig.links.classicSite}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors hover:bg-white/10"
          >
            gpura.org
          </a>
        </div>
      </header>

      {/* Floating bottom hint */}
      <div className="fixed bottom-4 left-4 z-20 pointer-events-none">
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          Drag to explore · Scroll to pan
        </p>
      </div>

      {/* Info button */}
      <InfoButton />

      {/* Item drawer */}
      <ItemDrawer />

      {/* Full-screen document viewer */}
      <DocumentViewer />
    </main>
  );
}
