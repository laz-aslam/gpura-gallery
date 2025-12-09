# gpura

> A [Public Work](https://public.work)-inspired infinite canvas for exploring [Granthappura](https://gpura.org) — Kerala's Digital Archive

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Overview

gpura is an immersive visual discovery interface for browsing Kerala's digital heritage. Inspired by [Public Work by Cosmos](https://www.cosmos.so/public-work), it presents archive items as an infinite mural of images that you can pan, zoom, and explore in any direction.

### Features

- **Infinite Canvas** — Pan in all directions, images scattered organically like a mural
- **Momentum Scrolling** — Smooth, fluid interactions with physics-based momentum
- **Search** — Find items across 6,700+ digitised artefacts
- **Minimal UI** — Images are the focus, metadata appears on hover
- **Fast** — Tile-based loading with viewport culling
- **Mobile-friendly** — Touch gestures supported

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
| Zoom | ⌘/Ctrl + Scroll | Pinch |
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
  name: "gpura",
  tagline: "Explore Kerala's digital archive",
  links: {
    classicSite: "https://gpura.org",
    github: "https://github.com/your-org/your-repo",
  },
};
```

### Switch to Real Data

By default, the app uses mock data. To use the real gpura API:

```typescript
// src/store/canvas-store.ts
useMockData: false
```

## Architecture

```
src/
├── app/
│   ├── api/           # API routes (search, tiles, item)
│   └── page.tsx       # Main canvas page
├── components/
│   ├── InfiniteCanvas.tsx    # Canvas with pan/zoom
│   ├── CanvasItemCard.tsx    # Image cards
│   ├── SearchBar.tsx         # Search input
│   └── ItemDrawer.tsx        # Detail drawer
├── store/
│   ├── canvas-store.ts       # Camera, tiles state
│   └── search-store.ts       # Query, filters state
├── server/adapters/
│   └── OmekaAdapter.ts       # gpura API integration
└── lib/
    ├── types.ts              # TypeScript types
    └── canvas-utils.ts       # Position/culling math
```

## Adapting for Other Archives

This works with any [Omeka S](https://omeka.org/s/) installation:

1. Update `OMEKA_BASE_URL` in `.env.local`
2. Update site config in `src/config/site.ts`
3. Adjust property mappings in `src/config/omeka-mapping.ts` if needed

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)

## Attribution

- Content from [Granthappura / gpura.org](https://gpura.org)
- Design inspired by [Public Work](https://public.work) by Cosmos
- Many collections available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## License

MIT — see [LICENSE](LICENSE)

---

Built for Kerala's digital heritage ✦
