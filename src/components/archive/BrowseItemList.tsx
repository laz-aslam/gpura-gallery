import Link from "next/link";
import type { ArchiveItem } from "@/lib/types";

function itemMeta(item: ArchiveItem): string {
  return [item.authors?.[0], item.year, item.type, item.language?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
}

export function BrowseItemList({
  heading,
  items,
}: {
  heading: string;
  items: ArchiveItem[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">{heading}</h2>
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Link href={`/${item.id}`} className="text-lg font-medium underline-offset-4 hover:underline">
              {item.title}
            </Link>
            {itemMeta(item) && <p className="mt-2 text-sm text-white/60">{itemMeta(item)}</p>}
            {item.collection && (
              <p className="mt-1 text-sm text-white/45">Collection: {item.collection}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
