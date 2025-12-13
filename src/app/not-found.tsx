import Link from "next/link";

export default function NotFound() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "#0a0a0a" }}
    >
      <div className="text-center max-w-md">
        {/* Icon */}
        <div 
          className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <svg 
            className="w-10 h-10" 
            style={{ color: "#444" }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>

        <h1 className="text-2xl font-medium mb-2">Item Not Found</h1>
        
        <p className="mb-8" style={{ color: "#888" }}>
          The item you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "white", color: "black" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Explore Gallery
        </Link>
      </div>
    </div>
  );
}

