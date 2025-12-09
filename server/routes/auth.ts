import type { Express } from "express";
import { storage } from "../storage";
import { updateUserProfileSchema, neonAuthUsers } from "@shared/schema";
import { isAuthenticated } from "../stackAuth";
import { db } from "../db";
import { eq, isNull, and } from "drizzle-orm";
import logger from "../logger";

export function registerAuthRoutes(app: Express) {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.stackUser!.id;
      let user = await storage.getUser(userId);
      
      // If user doesn't exist in our database, create them (lazy user creation)
      if (!user) {
        logger.log(`👤 [AUTH] Creating new user record for Stack Auth user: ${userId}`);

        let neonAuthUser: { email: string | null; name: string | null } | undefined;
        try {
          const [neonUserRow] = await db
            .select()
            .from(neonAuthUsers)
            .where(
              and(
                eq(neonAuthUsers.id, userId),
                isNull(neonAuthUsers.deletedAt)
              )
            )
            .limit(1);
          if (neonUserRow) {
            neonAuthUser = neonUserRow as any;
          } else {
            logger.warn(`User ${userId} not found in neon_auth.users_sync or user has been deleted`);
          }
        } catch (dbError: any) {
          // If the neon_auth schema/table is not reachable, fall back to minimal creation
          if (dbError?.code === '42P01') {
            logger.warn('neon_auth.users_sync not found; proceeding with minimal user creation');
          } else {
            logger.error('Error querying neon_auth.users_sync:', dbError);
            throw dbError;
          }
        }

        const newUserData = {
          id: userId,
          email: neonAuthUser?.email || undefined,
          firstName: neonAuthUser?.name?.split(' ')[0] || undefined,
          lastName: neonAuthUser?.name?.split(' ').slice(1).join(' ') || undefined,
        };
        user = await storage.upsertUser(newUserData);
        logger.log(`✅ [AUTH] User created successfully: ${userId}`);
      }
      
      // Auto-cleanup malformed data if present
      if (user?.profileData) {
        const profileData = user.profileData as any;
        let needsUpdate = false;
        const updatedProfileData = { ...profileData };
        
        // Clean up malformed blog profile
        if (profileData.blogProfile) {
          const { cleanupBlogProfile } = await import('../services/ai/blog.js');
          const cleanedBlogProfile = cleanupBlogProfile(profileData.blogProfile);
          
          if (JSON.stringify(profileData.blogProfile) !== JSON.stringify(cleanedBlogProfile)) {
            logger.log(`🔧 [AUTH] Auto-cleaning malformed blog profile for user ${userId}`);
            updatedProfileData.blogProfile = cleanedBlogProfile;
            needsUpdate = true;
          }
        }
        
        // Remove internal fields that shouldn't be in the database
        const internalFields = ['_cappedFields', '_capped_fields', 'cached_at'];
        internalFields.forEach(field => {
          if (profileData[field]) {
            logger.log(`🔧 [AUTH] Removing internal field '${field}' for user ${userId}`);
            delete updatedProfileData[field];
            needsUpdate = true;
          }
        });
        
        // Save cleaned data if needed
        if (needsUpdate) {
          await storage.updateUserProfile(userId, { profileData: updatedProfileData });
          return res.json({ ...user, profileData: updatedProfileData });
        }
      }
      
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.stackUser!.id;
      const profileData = updateUserProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      logger.error("Profile update error:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });
}