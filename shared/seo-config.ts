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
  // Add more routes as your app grows:
  // {
  //   path: "/about",
  //   title: "About Us | My App",
  //   description: "Learn more about our mission and team.",
  //   component: "About",  // Maps to client/src/pages/About.tsx
  // },
  // {
  //   path: "/contact",
  //   title: "Contact Us | My App",
  //   description: "Get in touch with our team.",
  //   component: "Contact",  // Maps to client/src/pages/Contact.tsx
  // },
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
