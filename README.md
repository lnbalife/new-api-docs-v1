# new-api-docs-v1

A Next.js documentation site for New API.

## Development

Run the development server:

```bash
bun install

bun dev
```

Open http://localhost:3000 with your browser to see the result.

## Updating Chinese Docs

After editing files under `content/docs/zh`, run:

```bash
bun run translate
bun run build
```

- `bun run translate`: runs `scripts/translate-docs.ts` to sync English and Japanese docs.
- `bun run build`: runs `scripts/prebuild.ts` before `next build` to verify the site can build.

## Build

Build the application for production:

```bash
bun run build
```

## Project Structure

| Path                      | Description                  |
| ------------------------- | ---------------------------- |
| `app/[lang]/(docs)`       | Documentation pages (i18n)   |
| `app/api/search/route.ts` | Search API endpoint          |
| `content/docs/`           | Documentation content (MDX)  |
| `lib/source.ts`           | Content source configuration |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
