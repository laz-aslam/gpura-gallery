import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { ArchiveItem } from "@/lib/types";
import {
  getDiscoverLanguageLinks,
  getDiscoverTypeLinks,
} from "@/server/archive";

const archiveStats = [
  { label: "Items", value: "6,782" },
  { label: "Languages", value: "14" },
  { label: "Collections", value: "42" },
  { label: "Authors", value: "1,337" },
  { label: "Pages", value: "721,036" },
];

function formatItemMeta(item: ArchiveItem): string {
  return [item.authors?.[0], item.year, item.type, item.language?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
}

export function HomeSeoContent({ featuredItems }: { featuredItems: ArchiveItem[] }) {
  const languageLinks = getDiscoverLanguageLinks().slice(0, 8);
  const typeLinks = getDiscoverTypeLinks();

  return (
    <section className="absolute inset-0 overflow-auto bg-[#0a0a0a] text-white">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-10 px-6 py-10 md:px-10 md:py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">
            Kerala Digital Archive
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Explore digitized books, periodicals, manuscripts, images, audio, and video from Kerala.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/75 md:text-lg">
            Granthappura is a public-facing archive of cultural material related to Kerala across multiple languages and scripts. This gallery offers a fast visual way to discover works from the archive, while each item page preserves the bibliographic context that researchers, readers, and search systems need.
          </p>
          <p className="max-w-2xl text-sm leading-6 text-white/60">
            Browse the classic archive at <a href={siteConfig.links.classicSite} className="underline underline-offset-4">gpura.org</a> or use the interactive gallery to move through the collection visually.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {archiveStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
            >
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/55">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold">Featured Archive Pages</h2>
              <Link href="/discover" className="text-sm text-white/70 underline underline-offset-4">
                Browse all index pages
              </Link>
            </div>
            <ol className="grid gap-3 md:grid-cols-2">
              {featuredItems.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Link href={`/${item.id}`} className="text-base font-medium text-white underline-offset-4 hover:underline">
                    {item.title}
                  </Link>
                  {formatItemMeta(item) && (
                    <p className="mt-2 text-sm text-white/60">{formatItemMeta(item)}</p>
                  )}
                  {item.collection && (
                    <p className="mt-1 text-sm text-white/45">Collection: {item.collection}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Browse By Type</h2>
              <div className="flex flex-wrap gap-2">
                {typeLinks.map((link) => (
                  <Link
                    key={link.type}
                    href={link.href}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Browse By Language</h2>
              <div className="flex flex-wrap gap-2">
                {languageLinks.map((link) => (
                  <Link
                    key={link.code}
                    href={link.href}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
