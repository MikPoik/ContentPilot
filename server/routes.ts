import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replitAuth";
import { registerAuthRoutes } from "./routes/auth";
import { registerConversationRoutes } from "./routes/conversations";
import { registerMessageRoutes } from "./routes/messages";
import { registerMemoryRoutes } from "./routes/memories";
import { registerSubscriptionRoutes } from "./routes/subscriptions";
import { registerInstagramRoutes } from "./routes/instagram";
import { getCacheStats } from "./seo-prerender";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Register all route modules
  registerSubscriptionRoutes(app); // Must be first for webhook middleware
  registerAuthRoutes(app);
  registerConversationRoutes(app);
  registerMessageRoutes(app);
  registerMemoryRoutes(app);
  registerInstagramRoutes(app);

  // Optional: Debug endpoint for SEO cache stats (remove in production or add auth)
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/seo-cache-stats', (_req, res) => {
      res.json(getCacheStats());
    });
  }

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}