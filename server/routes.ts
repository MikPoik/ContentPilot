import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replitAuth";
import { registerAuthRoutes } from "./routes/auth";
import { registerConversationRoutes } from "./routes/conversations";
import { registerMessageRoutes } from "./routes/messages";
import { registerMemoryRoutes } from "./routes/memories";
import { registerSubscriptionRoutes } from "./routes/subscriptions";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  await setupAuth(app);

  // Register all route modules
  registerSubscriptionRoutes(app); // Must be first for webhook middleware
  registerAuthRoutes(app);
  registerConversationRoutes(app);
  registerMessageRoutes(app);
  registerMemoryRoutes(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}