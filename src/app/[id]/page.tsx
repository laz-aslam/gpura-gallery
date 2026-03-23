import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { ItemSeoContent } from "@/components/archive/ItemSeoContent";
import { siteConfig } from "@/config/site";
import { buildSiteUrl } from "@/lib/site-url";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import { ItemViewerShell } from "./ItemViewerShell";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
};

function getSchemaType(type?: string | null): string {
  switch (type) {
    case "book":
      return "Book";
    case "image":
      return "ImageObject";
    case "audio":
      return "AudioObject";
    case "video":
      return "VideoObject";
    default:
      return "CreativeWork";
  }
}

function buildItemDescription(title: string, type?: string | null, year?: number | null, description?: string | null) {
  if (description) {
    return description;
  }

  return `${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Archive item"}${year ? ` from ${year}` : ""} in the Granthappura gallery archive: ${title}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return { title: "gpura gallery" };
  }

  const adapter = await getDataAdapter();
  const item = await adapter.getItem(id);

  if (!item) {
    return { title: "Item not found | gpura gallery" };
  }

  const description = buildItemDescription(item.title, item.type, item.year, item.description);

  return {
    title: `${item.title} | gpura gallery`,
    description,
    alternates: {
      canonical: `/${id}`,
    },
    openGraph: {
      title: item.title,
      description,
      url: `/${id}`,
      type: "article",
      images: item.thumbnailUrl
        ? [{ url: item.thumbnailUrl, width: 400, height: 600, alt: item.title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    },
  };
}

export default async function ItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { p } = await searchParams;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const page = p ? Number.parseInt(p, 10) - 1 : 0;
  const validPage = Number.isNaN(page) ? 0 : Math.max(0, page);

  const adapter = await getDataAdapter();
  const item = await adapter.getItem(id);

  if (!item) {
    notFound();
  }

  const description = buildItemDescription(item.title, item.type, item.year, item.description);
  const schemaType = getSchemaType(item.type);
  const itemUrl = buildSiteUrl(`/${id}`);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": schemaType,
      name: item.title,
      description,
      url: itemUrl,
      sameAs: item.sourceUrl,
      inLanguage: item.language || undefined,
      datePublished: item.year ? String(item.year) : undefined,
      author: item.authors?.map((name) => ({
        "@type": "Person",
        name,
      })),
      publisher: item.publisher
        ? {
            "@type": "Organization",
            name: item.publisher,
          }
        : {
            "@type": "Organization",
            name: siteConfig.organizationName,
            url: siteConfig.links.classicSite,
          },
      image: item.thumbnailUrl ? [item.thumbnailUrl] : undefined,
      about: item.subjects?.map((subject) => ({
        "@type": "Thing",
        name: subject,
      })),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: buildSiteUrl("/"),
      },
      license: item.rights || undefined,
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
          name: item.title,
          item: itemUrl,
        },
      ],
    },
  ];

  return (
    <>
      <SeoJsonLd data={jsonLd} />
      <ItemSeoContent item={item} />
      <ItemViewerShell item={item} initialPage={validPage} />
    </>
  );
}
