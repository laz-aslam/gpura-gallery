import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { ItemDetail } from "@/lib/types";

function formatMeta(item: ItemDetail): string {
  return [item.year, item.type, item.language?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
}

export function ItemSeoContent({ item }: { item: ItemDetail }) {
  return (
    <article className="min-h-screen bg-[#0a0a0a] px-6 py-10 text-white md:px-10 md:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Explore Gallery
          </Link>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/55 underline underline-offset-4"
          >
            View on gpura.org
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <div className="space-y-4">
            {item.thumbnailUrl && (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                Granthappura Item
              </p>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {item.documentSource
                  ? "This page opens the full-screen reader automatically for visitors, while keeping the archival description available in HTML for search engines, citations, and accessibility tools."
                  : "This item does not have a viewable document in the gallery reader yet, but its record and source link remain available here."}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <header className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Archive Record</p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                {item.title}
              </h1>
              {formatMeta(item) && <p className="text-base text-white/65">{formatMeta(item)}</p>}
            </header>

            <div className="grid gap-6 md:grid-cols-2">
              {item.authors && item.authors.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.24em] text-white/45">Author</h2>
                  <p className="text-sm leading-6 text-white/75">{item.authors.join(", ")}</p>
                </section>
              )}

              {item.collection && (
                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.24em] text-white/45">Collection</h2>
                  <p className="text-sm leading-6 text-white/75">{item.collection}</p>
                </section>
              )}

              {item.publisher && (
                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.24em] text-white/45">Publisher</h2>
                  <p className="text-sm leading-6 text-white/75">{item.publisher}</p>
                </section>
              )}

              {item.rights && (
                <section className="space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.24em] text-white/45">Rights</h2>
                  <p className="text-sm leading-6 text-white/75">{item.rights}</p>
                </section>
              )}
            </div>

            {item.description && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="max-w-3xl text-base leading-8 text-white/75">{item.description}</p>
              </section>
            )}

            {item.subjects && item.subjects.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Subjects</h2>
                <ul className="flex flex-wrap gap-2">
                  {item.subjects.map((subject) => (
                    <li
                      key={subject}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/65"
                    >
                      {subject}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-3">
              {item.documentSource && (
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                  Reader opens automatically in JavaScript-enabled browsers
                </span>
              )}
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Original record on gpura.org
              </a>
              <a
                href={siteConfig.links.classicSite}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Browse main archive
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
