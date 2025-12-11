"use client";

import { useState, useRef, useEffect } from "react";
import { siteConfig } from "@/config/site";

export function InfoButton() {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-12 right-0 w-80 p-4 rounded-lg backdrop-animate"
          style={{
            background: "rgba(20, 20, 20, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          }}
        >
          <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            കേരളവുമായി ബന്ധപ്പെട്ട്, എല്ലാ ഭാഷകളിലും ലിപികളിലും ഉള്ള കൈയെഴുത്ത് രേഖകൾ, അച്ചടി പുസ്തകങ്ങൾ, ചിത്രങ്ങൾ, ഓഡിയോ, വീഡിയോ തുടങ്ങിയവ ശേഖരിച്ച് ഡിജിറ്റൈസ് ചെയ്ത് പൊതുവായി പങ്കുവെക്കുന്ന പദ്ധതി.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Granthappura (ഗ്രന്ഥപ്പുര) by{" "}
            <a
              href={siteConfig.links.classicSite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Indic Digital Archive Foundation
            </a>{" "}
            is a diverse collection of digitized artefacts related to Kerala, across various languages and scripts.
          </p>
          <div className="mt-3 pt-3 flex flex-wrap gap-y-3" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div className="text-center" style={{ width: "33.33%" }}>
              <div className="text-sm font-semibold text-white">6,782</div>
              <div className="text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Items</div>
            </div>
            <div className="text-center" style={{ width: "33.33%" }}>
              <div className="text-sm font-semibold text-white">14</div>
              <div className="text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Languages</div>
            </div>
            <div className="text-center" style={{ width: "33.33%" }}>
              <div className="text-sm font-semibold text-white">42</div>
              <div className="text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Collections</div>
            </div>
            <div className="text-center" style={{ width: "33.33%" }}>
              <div className="text-sm font-semibold text-white">1,337</div>
              <div className="text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Authors</div>
            </div>
            <div className="text-center" style={{ width: "33.33%" }}>
              <div className="text-sm font-semibold text-white">7,21,036</div>
              <div className="text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>Pages</div>
            </div>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <div className="flex flex-col gap-2">
              <a
                href={siteConfig.links.classicSite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-2 hover:text-white transition-colors"
                style={{ color: "rgba(255, 255, 255, 0.5)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                gpura.org
              </a>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-2 hover:text-white transition-colors"
                style={{ color: "rgba(255, 255, 255, 0.5)" }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Source Code
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Info Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
        style={{
          background: isOpen ? "rgba(255, 255, 255, 0.1)" : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
        }}
        aria-label="Information"
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "rgba(255, 255, 255, 0.6)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>
  );
}
