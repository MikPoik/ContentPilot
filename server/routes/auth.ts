import type { Express } from "express";
import { storage } from "../storage";
import { updateUserProfileSchema } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";

export function registerAuthRoutes(app: Express) {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
            console.log(`🔧 [AUTH] Auto-cleaning malformed blog profile for user ${userId}`);
            updatedProfileData.blogProfile = cleanedBlogProfile;
            needsUpdate = true;
          }
        }
        
        // Remove internal fields that shouldn't be in the database
        const internalFields = ['_cappedFields', '_capped_fields', 'cached_at'];
        internalFields.forEach(field => {
          if (profileData[field]) {
            console.log(`🔧 [AUTH] Removing internal field '${field}' for user ${userId}`);
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
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = updateUserProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ message: "Invalid profile data" });
    }
  });
}