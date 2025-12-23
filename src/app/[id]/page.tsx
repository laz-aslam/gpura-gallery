import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDataAdapter } from "@/server/adapters/DataAdapter";
import { ItemViewerPage } from "./ItemViewerPage";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
};

// Generate dynamic metadata for SEO/OG sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  // Skip if not a numeric ID (could be other routes)
  if (!/^\d+$/.test(id)) {
    return { title: "gpura gallery" };
  }

  const adapter = await getDataAdapter();
  const item = await adapter.getItem(id);

  if (!item) {
    return { title: "Item not found | gpura gallery" };
  }

  const description = item.description 
    || `${item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Document"}${item.year ? ` from ${item.year}` : ""} in the gpura archive`;

  return {
    title: `${item.title} | gpura gallery`,
    description,
    openGraph: {
      title: item.title,
      description,
      type: "article",
      images: item.thumbnailUrl ? [{ url: item.thumbnailUrl, width: 400, height: 600 }] : [],
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
  
  // Validate ID is numeric
  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const page = p ? parseInt(p, 10) - 1 : 0; // Convert to 0-indexed
  const validPage = Math.max(0, page); // Ensure non-negative

  const adapter = await getDataAdapter();
  const item = await adapter.getItem(id);

  if (!item) {
    notFound();
  }

  return <ItemViewerPage item={item} initialPage={validPage} />;
}




