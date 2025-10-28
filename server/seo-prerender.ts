/**
 * SEO Prerendering System
 * 
 * This module handles Dynamic Memory Cache Prerendering for SEO.
 * It pre-renders React components to HTML strings at server startup
 * and caches them in memory for instant serving to search engine crawlers.
 */

import { type Request, type Response, type NextFunction } from "express";
import { seoRoutes, crawlerUserAgents, type SeoRoute } from "@shared/seo-config";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";

/**
 * In-memory cache storing pre-rendered HTML for each route.
 * Key: route path, Value: full HTML string
 */
const prerenderCache = new Map<string, string>();

/**
 * Check if a User-Agent string belongs to a search engine crawler.
 */
function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return crawlerUserAgents.some((bot: string) => ua.includes(bot));
}

/**
 * Generate the full HTML document with proper meta tags.
 */
function generateHtmlDocument(content: string, route: SeoRoute, baseTemplate: string): string {
  // Replace title
  let html = baseTemplate.replace(
    /<title>.*?<\/title>/,
    `<title>${route.title}</title>`
  );
  
  // Add meta description if not present, or replace if present
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta name="description" content=".*?">/,
      `<meta name="description" content="${route.description}">`
    );
  } else {
    html = html.replace(
      '</head>',
      `  <meta name="description" content="${route.description}">\n  </head>`
    );
  }
  
  // Add Open Graph tags
  const ogTags = `
    <meta property="og:title" content="${route.title}">
    <meta property="og:description" content="${route.description}">
    <meta property="og:type" content="website">`;
  
  html = html.replace('</head>', `${ogTags}\n  </head>`);
  
  // Inject the pre-rendered content into the root div
  html = html.replace(
    /<div id="root"><\/div>/,
    `<div id="root">${content}</div>`
  );
  
  return html;
}

/**
 * Pre-render all SEO routes and cache them in memory.
 * This runs once at server startup.
 */
export async function initializePrerender(): Promise<void> {
  console.log('[SEO Prerender] Initializing prerender cache...');
  
  try {
    // Load the base template
    const isProduction = process.env.NODE_ENV === 'production';
    let baseTemplate: string;
    
    if (isProduction) {
      // In production, look for the built template
      const templatePath = path.resolve(import.meta.dirname, 'public', 'index.html');
      
      if (!fs.existsSync(templatePath)) {
        console.warn('[SEO Prerender] Production template not found at:', templatePath);
        console.warn('[SEO Prerender] Skipping prerender initialization - crawlers will receive client-side rendered content');
        return;
      }
      
      baseTemplate = fs.readFileSync(templatePath, 'utf-8');
      
      // In production, try to load the SSR bundle if available
      // If SSR bundle doesn't exist, fall back to basic SEO-friendly HTML
      const ssrBundlePath = path.resolve(import.meta.dirname, 'entry-server.js');
      
      if (fs.existsSync(ssrBundlePath)) {
        try {
          // Use the built SSR bundle for proper server-side rendering
          const { render } = await import(ssrBundlePath);
          
          for (const route of seoRoutes) {
            try {
              const appHtml = render(route.path);
              const html = generateHtmlDocument(appHtml, route, baseTemplate);
              prerenderCache.set(route.path, html);
              console.log(`[SEO Prerender] Cached route (SSR): ${route.path}`);
            } catch (error) {
              console.error(`[SEO Prerender] Failed to render route ${route.path}:`, error);
            }
          }
        } catch (error) {
          console.error('[SEO Prerender] Failed to load SSR bundle, falling back to basic HTML:', error);
          // Fall through to basic HTML fallback
        }
      } else {
        console.warn('[SEO Prerender] SSR bundle not found - using basic SEO fallback HTML');
        
        // Fallback: Generate basic SEO-friendly HTML with structured data
        for (const route of seoRoutes) {
          try {
            const content = `
              <main class="container mx-auto px-4 py-8">
                <h1 class="text-4xl font-bold mb-4">${route.title.split('|')[0].trim()}</h1>
                <p class="text-lg text-gray-600">${route.description}</p>
                <noscript>
                  <p class="mt-4 text-sm text-gray-500">
                    This application requires JavaScript to run. Please enable JavaScript in your browser.
                  </p>
                </noscript>
              </main>
              <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": "${route.title}",
                "description": "${route.description}"
              }
              </script>
            `;
            
            const html = generateHtmlDocument(content, route, baseTemplate);
            prerenderCache.set(route.path, html);
            
            console.log(`[SEO Prerender] Cached route (fallback): ${route.path}`);
          } catch (error) {
            console.error(`[SEO Prerender] Failed to render route ${route.path}:`, error);
          }
        }
      }
    } else {
      // In development, use Vite SSR to render actual components
      const devTemplatePath = path.resolve(import.meta.dirname, '..', 'client', 'index.html');
      
      if (!fs.existsSync(devTemplatePath)) {
        console.warn('[SEO Prerender] Development template not found, skipping prerender initialization');
        return;
      }
      
      baseTemplate = fs.readFileSync(devTemplatePath, 'utf-8');
      
      // Create a temporary Vite server for SSR
      const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        server: { middlewareMode: true },
        appType: "custom",
      });
      
      try {
        // Pre-render each route using Vite SSR
        for (const route of seoRoutes) {
          try {
            // Load the SSR entry module
            const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
            
            // Render the component for this route
            const appHtml = render(route.path);
            
            // Inject into template
            const html = generateHtmlDocument(appHtml, route, baseTemplate);
            prerenderCache.set(route.path, html);
            
            console.log(`[SEO Prerender] Cached route: ${route.path}`);
          } catch (error) {
            console.error(`[SEO Prerender] Failed to render route ${route.path}:`, error);
          }
        }
      } finally {
        // Close the temporary Vite server
        await vite.close();
      }
    }
    
    console.log(`[SEO Prerender] Successfully cached ${prerenderCache.size} routes`);
  } catch (error) {
    console.error('[SEO Prerender] Initialization failed:', error);
  }
}

/**
 * Express middleware that serves pre-rendered HTML to crawlers.
 * Regular users continue to receive the standard CSR experience.
 * 
 * This should be registered BEFORE the Vite middleware or static file serving.
 */
export function seoMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only intercept GET requests for HTML pages
  if (req.method !== 'GET') {
    return next();
  }
  
  // Skip API routes and static assets
  if (req.path.startsWith('/api') || 
      req.path.includes('.') || 
      req.path.startsWith('/assets') ||
      req.path.startsWith('/src')) {
    return next();
  }
  
  // Check if this is a crawler
  const userAgent = req.headers['user-agent'] || '';
  if (!isCrawler(userAgent)) {
    return next();
  }
  
  // Check if we have a pre-rendered version of this route
  const cachedHtml = prerenderCache.get(req.path);
  if (cachedHtml) {
    console.log(`[SEO Prerender] Serving cached HTML to crawler for: ${req.path}`);
    res.status(200).set({ 'Content-Type': 'text/html' }).send(cachedHtml);
    return;
  }
  
  // No cached version, fall through to normal rendering
  next();
}

/**
 * Utility to manually refresh the cache (useful for dynamic content updates).
 */
export async function refreshPrerenderCache(): Promise<void> {
  prerenderCache.clear();
  await initializePrerender();
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats() {
  return {
    size: prerenderCache.size,
    routes: Array.from(prerenderCache.keys()),
    sizeInBytes: JSON.stringify(Array.from(prerenderCache.values())).length
  };
}

/**
 * Clear cache for a specific route.
 */
export function invalidateRoute(path: string): void {
  prerenderCache.delete(path);
  console.log(`[SEO Prerender] Invalidated cache for route: ${path}`);
}
