import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import logger from "./logger";

/**
 * Extend Express Request to include Stack user
 */
declare global {
  namespace Express {
    interface Request {
      stackUser?: {
        id: string;
      };
    }
  }
}

/**
 * Middleware to check if user is authenticated with Stack Auth
 * Stack Auth manages sessions client-side, we just extract the user ID from headers
 */
export const isAuthenticated: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user ID from custom header sent by client (set by Stack Auth)
    const userId = req.headers['x-stack-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user ID to request for downstream handlers
    // No need to validate against neon_auth.users_sync on every request
    // That table is only queried during user creation/lazy loading
    req.stackUser = {
      id: userId,
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
