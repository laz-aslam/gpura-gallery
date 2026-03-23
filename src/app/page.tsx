import { HomeShell } from "@/components/HomeShell";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { HomeSeoContent } from "@/components/archive/HomeSeoContent";
import { siteConfig } from "@/config/site";
import { buildSiteUrl } from "@/lib/site-url";
import { getFeaturedItems } from "@/server/archive";

export default async function Home() {
  const featuredItems = await getFeaturedItems(12);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      description: siteConfig.description,
      url: buildSiteUrl("/"),
      publisher: {
        "@type": "Organization",
        name: siteConfig.organizationName,
        url: siteConfig.links.classicSite,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: siteConfig.name,
      description: siteConfig.description,
      url: buildSiteUrl("/"),
      isPartOf: {
        "@type": "WebSite",
        name: siteConfig.name,
        url: buildSiteUrl("/"),
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: featuredItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: buildSiteUrl(`/${item.id}`),
          name: item.title,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.organizationName,
      url: siteConfig.links.classicSite,
      sameAs: [siteConfig.links.classicSite, siteConfig.links.github],
    },
  ];

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <SeoJsonLd data={jsonLd} />
      <HomeSeoContent featuredItems={featuredItems} />
      <HomeShell />
    </main>
  );
}
