# Gpura Gallery

> An infinite canvas for exploring [Granthappura](https://gpura.org) — Kerala's Digital Archive

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Overview

Gpura Gallery is an immersive visual discovery interface for browsing Kerala's digital heritage. It presents archive items as an infinite mural of images that you can pan and explore in any direction.

### Features

- **Infinite Canvas** — Pan in all directions, images scattered organically like a mural
- **Momentum Scrolling** — Smooth, fluid interactions with physics-based momentum
- **Search** — Find items across 6,700+ digitised artefacts
- **PDF Viewer** — Read digitised documents with an integrated PDF viewer
- **Minimal UI** — Images are the focus, metadata appears on hover
- **Fast** — Tile-based loading with viewport culling

## Quick Start

```bash
# Clone
git clone https://github.com/laz-aslam/gpura-gallery.git
cd gpura-gallery

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Pan | Drag / Scroll | Drag |
| Search | Press `/` | Tap search |
| View details | Click image | Tap image |

## Configuration

### Environment Variables

```bash
# .env.local
OMEKA_BASE_URL=https://gpura.org
OMEKA_ITEMS_ENDPOINT=/api/items
```

### Site Config

Edit `src/config/site.ts`:

```typescript
export const siteConfig = {
  name: "gpura gallery",
  tagline: "Explore Kerala's digital archive",
  description: "Search through thousands of digitised books, periodicals, and artefacts.",
  links: {
    classicSite: "https://gpura.org",
    github: "https://github.com/laz-aslam/gpura-gallery",
  },
};
```

## Architecture

```
src/
├── app/
│   ├── api/              # API routes (search, tiles, item, pdf, manifest)
│   ├── [id]/             # Individual item viewer page
│   └── page.tsx          # Main canvas page
├── components/
│   ├── InfiniteCanvas.tsx    # Canvas with pan/zoom
│   ├── CanvasItemCard.tsx    # Image cards
│   ├── FilterBar.tsx         # Search & filters
│   ├── ItemDrawer.tsx        # Detail drawer
│   ├── DocumentViewer.tsx    # Document display
│   ├── PdfViewer.tsx         # PDF reader
│   ├── CitationModal.tsx     # Citation generator
│   └── InfoButton.tsx        # Info tooltip
├── hooks/
│   ├── useDeviceType.ts      # Device detection
│   └── usePageUrlSync.ts     # URL state sync
├── store/
│   ├── canvas-store.ts       # Camera, tiles state
│   └── viewer-store.ts       # Viewer state
├── server/adapters/
│   ├── DataAdapter.ts        # Adapter interface
│   └── OmekaAdapter.ts       # Omeka S API integration
└── lib/
    ├── types.ts              # TypeScript types
    ├── canvas-utils.ts       # Position/culling math
    └── preload.ts            # Image preloading
```

## Adapting for Other Archives

This works with any [Omeka S](https://omeka.org/s/) installation:

1. Update `OMEKA_BASE_URL` in `.env.local`
2. Update site config in `src/config/site.ts`
3. Implement a custom adapter extending `DataAdapter` if needed

## Tech Stack

- [Next.js 16](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [react-pdf](https://github.com/wojtekmaj/react-pdf)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Attribution

- Content from [Granthappura / gpura.org](https://gpura.org)

## License

MIT — see [LICENSE](LICENSE)

---

Built for Kerala's digital heritage ✦
