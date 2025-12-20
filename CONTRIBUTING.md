# Contributing to gpura gallery

Thank you for your interest in contributing! This project is an infinite canvas interface for exploring Kerala's digital archive.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gpura-gallery.git
   cd gpura-gallery
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Development

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand

### Project Structure

- `src/app/` — Next.js pages and API routes
- `src/components/` — React components
- `src/server/adapters/` — Data adapters (Omeka S integration)
- `src/store/` — Zustand state stores
- `src/lib/` — Utilities and types

## Making Changes

1. Create a branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run linting:
   ```bash
   npm run lint
   ```
4. Commit with a clear message:
   ```bash
   git commit -m "Add: description of your change"
   ```
5. Push and open a Pull Request

## Reporting Issues

For bugs, feature requests, or discussions:
- Open a [GitHub Issue](https://github.com/laz-aslam/gpura-gallery/issues)
- Visit the [community forum](https://forum.indicarchive.org/tag/granthappura)

## Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Keep components focused and composable
- Use meaningful variable and function names

## License

By contributing, you agree that your contributions will be licensed under the MIT License.


