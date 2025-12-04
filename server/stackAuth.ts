import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { StackServerApp } from "@stackframe/stack";
import logger from "./logger";

// Required Stack Auth env vars
if (!process.env.STACK_SECRET_SERVER_KEY) {
  throw new Error("Environment variable STACK_SECRET_SERVER_KEY not provided");
}
if (!process.env.VITE_STACK_PROJECT_ID) {
  throw new Error("Environment variable VITE_STACK_PROJECT_ID not provided");
}
if (!process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY) {
  throw new Error("Environment variable VITE_STACK_PUBLISHABLE_CLIENT_KEY not provided");
}

// Initialize Stack Server App
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  projectId: process.env.VITE_STACK_PROJECT_ID!,
  publishableClientKey: process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  urls: {
    home: '/',
  },
});

/**
 * Extend Express Request to include Stack user
 */
declare global {
  namespace Express {
    interface Request {
      stackUser?: {
        id: string;
        email: string | null;
        displayName: string | null;
      };
    }
  }
}

/**
 * Middleware to check if user is authenticated with Stack Auth
 * Attaches user information to req.stackUser if authenticated
 */
export const isAuthenticated: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user from Stack Auth using the request
    const user = await stackServerApp.getUser({ tokenStore: req as any });
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user info to request for downstream handlers
    req.stackUser = {
      id: user.id,
      email: user.primaryEmail || null,
      displayName: user.displayName || null,
    };

    next();
  } catch (error) {
    logger.error("Stack Auth error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * Setup Stack Auth (if any global middleware is needed)
 * Currently Stack Auth is handled via client-side StackHandler
 * and server-side isAuthenticated middleware
 */
export async function setupStackAuth(app: Express) {
  logger.log("[STACK AUTH] Stack Auth initialized");
  logger.log(`[STACK AUTH] Project ID: ${process.env.VITE_STACK_PROJECT_ID}`);
  
  // No global middleware needed - auth is handled per-route
  // Stack Handler routes are managed client-side
}
