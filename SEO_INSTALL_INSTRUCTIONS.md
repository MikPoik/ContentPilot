# Pluggable SEO Prerender Framework — Installation Guide

This guide shows how to adopt the SEO prerendering framework in any React + Vite + Express (TypeScript, ESM) app with minimal changes.

The framework renders selected routes once at startup (or on demand), caches the HTML in memory, and serves it only to crawlers. Regular users get the normal client-side app.

---

## What you get
- In-memory prerender cache for SEO-critical routes
- Automatic sitemap.xml and robots.txt
- Development SSR via Vite, production SSR via built bundle (with graceful fallback)
- Minimal glue in your server (3 lines)

---

## Prerequisites
- React 18 + Vite 5
- Express server bundling with esbuild (ESM output) or equivalent
- TypeScript (recommended)
- Vite root at `client/` (or adjust paths below)

> Assumptions used here (adjust for your project):
> - Static assets build to `dist/public`
> - Server bundle outputs to `dist/index.js`
> - SSR entry bundle outputs to `dist/entry-server.js`

---

## Files to copy
Copy these files into the same relative locations, or adjust imports accordingly:

- `server/seo-prerender.ts` — prerender cache + crawler middleware
- `server/seo-files.ts` — dynamic `sitemap.xml` + `robots.txt`
- `shared/seo-config.ts` — list of SEO routes and user-agent patterns
- `client/src/entry-server.tsx` — SSR entry (maps routes → page components)

If you don’t use the `@` or `@shared` aliases, change those imports to relative paths.

---

## Minimal server wiring (3 lines)
Add these calls early in your server bootstrap — before Vite middleware in dev or static serving in prod:

```ts
// server/index.ts
import { registerSeoFileRoutes } from "./seo-files";
import { initializePrerender, seoMiddleware } from "./seo-prerender";

// ... after you create the Express app and register API routes
registerSeoFileRoutes(app);     // exposes /sitemap.xml and /robots.txt
await initializePrerender();    // builds the in-memory HTML cache
app.use(seoMiddleware);         // serves cached HTML to crawlers

// then wire Vite dev middleware or static file serving after this
```

> Order matters: register the SEO middleware before your catch-all SPA handler.

---

## Vite config expectations
Your `vite.config.ts` should set `root` to your client app and (optionally) alias shortcuts:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
```

If you don’t want aliases, replace `@`/`@shared` imports in the copied files with relative paths.

---

## Package scripts
Add (or adapt) these scripts. They produce the directory layout expected by the framework.

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:client && npm run build:ssr && npm run build:server",
    "build:client": "vite build",
    "build:ssr": "vite build --ssr src/entry-server.tsx --outDir ../dist --emptyOutDir false",
    "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

Notes:
- `vite build` uses output dirs from `vite.config.ts` → `dist/public`
- SSR build outputs `dist/entry-server.js`
- Keep `--emptyOutDir false` to avoid deleting `dist/public` when building SSR
- Optional: add `--ssrManifest` to `build:client` if you plan to do advanced asset preloading from SSR later

---

## Configure SEO routes
Edit `shared/seo-config.ts` to list pages you want pre-rendered. Component names should match files in `client/src/pages/`.

```ts
// shared/seo-config.ts
export interface SeoRoute {
  path: string;
  title: string;
  description: string;
  component: string; // e.g. "landing" maps to client/src/pages/landing.tsx
}

export const seoRoutes: SeoRoute[] = [
  {
    path: "/",
    title: "Your App | Welcome",
    description: "Your marketing description.",
    component: "landing",
  },
];

export const crawlerUserAgents = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegrambot",
];
```

---

## SSR entry (pages auto-discovery)
The provided `client/src/entry-server.tsx` discovers pages automatically and renders the route’s component. Adapt providers as needed for your app.

Minimal version (works in any React app):
```tsx
// client/src/entry-server.tsx
import { renderToString } from "react-dom/server";
import NotFound from "@/pages/not-found"; // or your 404
import { seoRoutes } from "@shared/seo-config";

const pages = import.meta.glob<{ default: () => JSX.Element }>("/src/pages/*.tsx", { eager: true });
const componentMap: Record<string, () => JSX.Element> = {};

for (const route of seoRoutes) {
  const pagePath = `/src/pages/${route.component}.tsx`;
  const mod = pages[pagePath];
  if (mod) componentMap[route.path] = mod.default;
}

export function render(url: string) {
  const C = componentMap[url] || NotFound;
  return renderToString(<C />);
}
```

If you use React Query, Theme, or other providers, wrap them here exactly as your client does (but avoid providers that read localStorage during SSR).

---

## How it works (dev vs prod)
- Development: uses Vite SSR `vite.ssrLoadModule('/src/entry-server.tsx')` to render pages into the in-memory cache at startup
- Production: tries to import `dist/entry-server.js`; if missing, falls back to injecting semantic HTML (title/description + JSON-LD) into `dist/public/index.html`

Template lookup paths (in the bundled server):
- HTML template: `dist/public/index.html`
- SSR entry: `dist/entry-server.js`

---

## Testing
- Verify crawler HTML: 
  ```bash
  curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" http://localhost:5000/
  ```
- Verify user HTML (no prerender):
  ```bash
  curl -A "Mozilla/5.0" http://localhost:5000/
  ```
- Check cache stats (optional utility exported):
  ```ts
  import { getCacheStats } from "./seo-prerender";
  console.log(getCacheStats());
  ```

---

## Optional: cache invalidation endpoints
You can wire lightweight admin endpoints to refresh the cache:

```ts
import { refreshPrerenderCache, invalidateRoute } from "./seo-prerender";

app.post("/admin/seo/refresh", async (_req, res) => {
  await refreshPrerenderCache();
  res.json({ ok: true });
});

app.post("/admin/seo/invalidate", async (req, res) => {
  const p = req.body?.path;
  if (!p) return res.status(400).json({ error: "path required" });
  invalidateRoute(p);
  res.json({ ok: true });
});
```

---

## Common pitfalls
- Register SEO middleware before your SPA catch-all/static serving
- Make sure your build outputs match the expected paths, or adjust `seo-prerender.ts`:
  - Template path: `path.resolve(__dirname, 'public', 'index.html')`
  - SSR entry path: `path.resolve(__dirname, 'entry-server.js')`
- Avoid providers that access `window`/`localStorage` during SSR
- If you don’t see prerendered HTML: ensure dev vs prod behavior is as expected and that `seoRoutes` component names match files

---

## Uninstall / disable
- Remove the three server lines (`registerSeoFileRoutes`, `initializePrerender`, `seoMiddleware`)
- Remove the four files listed above
- No other footprint remains

---

## License & attribution
This framework is designed to be copied into your project. Customize freely.
