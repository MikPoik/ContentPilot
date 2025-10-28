/**
 * SEO Files Generator
 * 
 * Automatically generates sitemap.xml and robots.txt based on your SEO configuration.
 * Integrates seamlessly with the prerender cache system.
 */

import { type Express } from "express";
import { seoRoutes } from "@shared/seo-config";

/**
 * Get the base URL for the application.
 * In production, this would be your actual domain.
 */
function getBaseUrl(): string {
  // In production, use environment variable or your actual domain
  if (process.env.NODE_ENV === 'production' && process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}`;
  }
  
  // In development, use localhost
  const port = process.env.PORT || '5000';
  return `http://localhost:${port}`;
}

/**
 * Generate sitemap.xml content based on configured SEO routes.
 */
export function generateSitemap(): string {
  const baseUrl = getBaseUrl();
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const urls = seoRoutes.map(route => {
    return `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Generate robots.txt content.
 */
export function generateRobotsTxt(): string {
  const baseUrl = getBaseUrl();
  
  return `# Robots.txt for ${baseUrl}
User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin routes if you have any
# Disallow: /admin/
# Disallow: /api/
`;
}

/**
 * Register SEO file routes (sitemap.xml and robots.txt) with Express.
 * Call this function during server startup to make these files available.
 */
export function registerSeoFileRoutes(app: Express): void {
  // Generate the files once at startup
  const sitemap = generateSitemap();
  const robotsTxt = generateRobotsTxt();
  
  // Serve sitemap.xml
  app.get('/sitemap.xml', (_req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  });
  
  // Serve robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });
  
  console.log('[SEO Files] Registered /sitemap.xml and /robots.txt routes');
}
