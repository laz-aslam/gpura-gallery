import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchivePageFrame } from "@/components/archive/ArchivePageFrame";
import { BrowseItemList } from "@/components/archive/BrowseItemList";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { buildSiteUrl } from "@/lib/site-url";
import { LANGUAGE_LABELS } from "@/lib/types";
import { getItemsByLanguage } from "@/server/archive";

type Props = {
  params: Promise<{ language: string }>;
};

export async function generateStaticParams() {
  return Object.keys(LANGUAGE_LABELS).map((language) => ({ language }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language } = await params;
  const languageLabel = LANGUAGE_LABELS[language];

  if (!languageLabel) {
    return {};
  }

  return {
    title: `${languageLabel} Archive Records | gpura gallery`,
    description: `Browse Granthappura records in ${languageLabel}.`,
    alternates: {
      canonical: `/discover/language/${language}`,
    },
  };
}

export default async function DiscoverLanguagePage({ params }: Props) {
  const { language } = await params;
  const languageLabel = LANGUAGE_LABELS[language];

  if (!languageLabel) {
    notFound();
  }

  const items = await getItemsByLanguage(language, 24);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${languageLabel} archive records`,
      description: `Browse Granthappura records in ${languageLabel}.`,
      url: buildSiteUrl(`/discover/language/${language}`),
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
          name: languageLabel,
          item: buildSiteUrl(`/discover/language/${language}`),
        },
      ],
    },
  ];

  return (
    <>
      <SeoJsonLd data={jsonLd} />
      <ArchivePageFrame
        eyebrow="Archive Index"
        title={`Browse ${languageLabel} records`}
        description={`Explore a selection of Granthappura items catalogued in ${languageLabel}. Each record links directly to an item page with citation details, source links, and reader access when available.`}
      >
        <BrowseItemList heading={`${languageLabel} Records`} items={items} />
      </ArchivePageFrame>
    </>
  );
}
