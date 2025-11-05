/**
 * SEO Configuration for Dynamic Memory Cache Prerendering
 * 
 * Define all SEO-critical routes that should be pre-rendered for crawlers.
 * Each route includes metadata for proper indexing.
 */

export interface SeoRoute {
  path: string;
  title: string;
  description: string;
  component: string;  // Page component name (e.g., "Home", "About", "Contact")
}

/**
 * Array of routes that should be pre-rendered for SEO crawlers.
 * Add all important pages that need to be indexed by search engines.
 */
export const seoRoutes: SeoRoute[] = [
  {
    path: "/",
    title: "WryteBot | Create engaging content with AI",
    description: "Welcome to WryteBot — the best solution for your content creation needs.",
    component: "landing",  // Maps to client/src/pages/Home.tsx
  },
  {
    path: "/pricing",
    title: "Pricing | WryteBot",
    description: "Simple, transparent pricing. Start free and upgrade anytime.",
    component: "pricing",
  },
  {
    path: "/how-it-works",
    title: "How it works | WryteBot",
    description: "See how WryteBot helps you research, ideate, and create content fast.",
    component: "how-it-works",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | WryteBot",
    description: "Read our terms of service and understand your rights when using WryteBot.",
    component: "terms-of-service",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | WryteBot",
    description: "Learn how WryteBot collects, uses, and protects your personal information.",
    component: "privacy-policy",
  },
];

/**
 * Common crawler User-Agent patterns to detect SEO bots.
 * This list covers the most popular search engine crawlers.
 */
export const crawlerUserAgents = [
  'googlebot',
  'bingbot',
  'slurp',        // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
];
