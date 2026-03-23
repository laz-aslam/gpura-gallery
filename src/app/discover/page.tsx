import type { Metadata } from "next";
import Link from "next/link";
import { ArchivePageFrame } from "@/components/archive/ArchivePageFrame";
import { BrowseItemList } from "@/components/archive/BrowseItemList";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { siteConfig } from "@/config/site";
import { buildSiteUrl } from "@/lib/site-url";
import {
  getDiscoverLanguageLinks,
  getDiscoverTypeLinks,
  getFeaturedItems,
} from "@/server/archive";

export const metadata: Metadata = {
  title: "Browse the Archive | gpura gallery",
  description:
    "Browse indexable archive pages for Granthappura by language, format, and featured works.",
  alternates: {
    canonical: "/discover",
  },
};

export default async function DiscoverPage() {
  const [featuredItems, languageLinks, typeLinks] = await Promise.all([
    getFeaturedItems(18),
    Promise.resolve(getDiscoverLanguageLinks()),
    Promise.resolve(getDiscoverTypeLinks()),
  ]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Browse the Granthappura archive",
      description:
        "Browse archive landing pages for Granthappura by language, format, and featured works.",
      url: buildSiteUrl("/discover"),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: buildSiteUrl("/"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: buildSiteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Discover",
          item: buildSiteUrl("/discover"),
        },
      ],
    },
  ];

  return (
    <>
      <SeoJsonLd data={jsonLd} />
      <ArchivePageFrame
        eyebrow="Archive Index"
        title="Browse the archive with crawlable, citation-friendly pages"
        description="These pages surface the same Granthappura collection in a structure that search engines, chatbots, and researchers can understand more easily: grouped by format, grouped by language, and linked directly to item records."
      >
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Browse By Type</h2>
            <div className="flex flex-wrap gap-2">
              {typeLinks.map((link) => (
                <Link
                  key={link.type}
                  href={link.href}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Browse By Language</h2>
            <div className="flex flex-wrap gap-2">
              {languageLinks.map((link) => (
                <Link
                  key={link.code}
                  href={link.href}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <BrowseItemList heading="Featured Records" items={featuredItems} />
      </ArchivePageFrame>
    </>
  );
}
