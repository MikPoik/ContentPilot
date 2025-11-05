/**
 * SSR Entry Point
 * 
 * This file is used by the server to render React components to HTML.
 * It wraps the app with all necessary providers for server-side rendering.
 */

import { renderToString } from "react-dom/server";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { Router } from "wouter";
import { seoRoutes } from "@shared/seo-config";
import NotFound from "@/pages/not-found";
import Landing from './pages/landing';
import PricingPage from './pages/pricing';
import HowItWorksPage from './pages/how-it-works';
import TermsOfService from './pages/terms-of-service';
import PrivacyPolicy from './pages/privacy-policy';

/**
 * Dynamically import all page components using Vite's import.meta.glob.
 * This loads all .tsx files from the pages directory eagerly (at build time).
 */
const pages = import.meta.glob<{ default: () => JSX.Element }>('/src/pages/*.tsx', { eager: true });

/**
 * Build component map automatically from seo-config.
 * No manual mapping needed! Just add the route to seo-config.ts with the component name.
 */
const componentMap: Record<string, () => JSX.Element> = {};

for (const route of seoRoutes) {
  const pagePath = `/src/pages/${route.component}.tsx`;
  const pageModule = pages[pagePath];

  if (pageModule) {
    componentMap[route.path] = pageModule.default;
  } else {
    console.error(`[SSR] Component not found: ${pagePath} for route ${route.path}`);
  }
}

/**
 * Renders the app for a given URL path.
 * This is called by the prerender system to generate static HTML.
 * 
 * Routes and components are automatically loaded from seo-config.ts.
 * Just add the route with component name - no manual mapping required!
 * 
 * Note: We don't use ThemeProvider during SSR to avoid localStorage access.
 * The client will hydrate with the proper theme from localStorage.
 */
export function render(url: string) {
  // Get the component for this route (automatically mapped)
  const Component = componentMap[url] || NotFound;

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router ssrPath={url}>
          <Component />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );

  return html;
}