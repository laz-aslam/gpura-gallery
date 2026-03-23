import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchivePageFrame } from "@/components/archive/ArchivePageFrame";
import { BrowseItemList } from "@/components/archive/BrowseItemList";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { buildSiteUrl } from "@/lib/site-url";
import { TYPE_LABELS } from "@/lib/types";
import { getItemsByType } from "@/server/archive";

type Props = {
  params: Promise<{ type: string }>;
};

export async function generateStaticParams() {
  return Object.keys(TYPE_LABELS).map((type) => ({ type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const typeLabel = TYPE_LABELS[type];

  if (!typeLabel) {
    return {};
  }

  return {
    title: `${typeLabel} Archive Records | gpura gallery`,
    description: `Browse Granthappura ${typeLabel.toLowerCase()} records.`,
    alternates: {
      canonical: `/discover/type/${type}`,
    },
  };
}

export default async function DiscoverTypePage({ params }: Props) {
  const { type } = await params;
  const typeLabel = TYPE_LABELS[type];

  if (!typeLabel) {
    notFound();
  }

  const items = await getItemsByType(type, 24);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${typeLabel} archive records`,
      description: `Browse Granthappura ${typeLabel.toLowerCase()} records.`,
      url: buildSiteUrl(`/discover/type/${type}`),
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
        {
          "@type": "ListItem",
          position: 3,
          name: typeLabel,
          item: buildSiteUrl(`/discover/type/${type}`),
        },
      ],
    },
  ];

  return (
    <>
      <SeoJsonLd data={jsonLd} />
      <ArchivePageFrame
        eyebrow="Archive Index"
        title={`Browse ${typeLabel.toLowerCase()} records`}
        description={`Explore Granthappura records grouped by format. This page highlights ${typeLabel.toLowerCase()} items from the archive and links to item pages with summaries, source data, and reader access when available.`}
      >
        <BrowseItemList heading={`${typeLabel} Records`} items={items} />
      </ArchivePageFrame>
    </>
  );
}
