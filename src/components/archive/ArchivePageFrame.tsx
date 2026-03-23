import Link from "next/link";
import { siteConfig } from "@/config/site";

export function ArchivePageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-10 text-white md:px-10 md:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Interactive Gallery
          </Link>
          <a
            href={siteConfig.links.classicSite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/55 underline underline-offset-4"
          >
            View original records on gpura.org
          </a>
        </div>

        <header className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">{eyebrow}</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
          <p className="text-base leading-7 text-white/70 md:text-lg">{description}</p>
        </header>

        {children}
      </div>
    </main>
  );
}
