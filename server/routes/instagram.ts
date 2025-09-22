import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../replitAuth.js';
import { hikerApiService } from '../services/hikerapi.js';
import { storage } from '../storage.js';
import { generateEmbedding } from '../services/openai.js';
import type { InstagramProfile } from '../../shared/schema.js';

const analyzeInstagramProfileSchema = z.object({
  username: z.string().min(1).max(30).regex(/^[a-zA-Z0-9_.]+$/, 'Invalid Instagram username format'),
});

export function registerInstagramRoutes(app: Express): void {
  // Analyze Instagram profile
  app.post('/api/instagram/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { username } = analyzeInstagramProfileSchema.parse(req.body);
      const userId = req.user.claims.sub;

      // Check if profile was analyzed recently (within 24 hours)
      const user = await storage.getUser(userId);
      const existingData = user?.profileData as any;
      
      if (existingData?.instagramProfile?.username === username) {
        const cachedAt = new Date(existingData.instagramProfile.cached_at);
        const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCache < 24) { //24 default
          return res.json({ 
            profile: existingData.instagramProfile,
            cached: true,
            message: 'Using cached profile data (less than 24 hours old)'
          });
        }
      }

      // Analyze the Instagram profile using HikerAPI
      const instagramProfile = await hikerApiService.analyzeInstagramProfile(username);
      
      // Store the Instagram profile data in user's profileData
      const updatedProfileData = {
        ...existingData,
        instagramProfile
      };

      await storage.updateUserProfile(userId, {
        profileData: updatedProfileData
      });

      // Create memory entries for key insights
      const memoryTexts = [
        `Instagram profile analysis for ${username}: ${instagramProfile.followers} followers, ${instagramProfile.engagement_rate.toFixed(2)}% engagement rate`,
        `Top hashtags for ${username}: ${instagramProfile.top_hashtags.join(', ')}`,
        `Content style insights for ${username}: ${instagramProfile.post_texts.slice(0, 3).join(' | ')}`,
        `Similar accounts to ${username}: ${instagramProfile.similar_accounts.map(acc => `${acc.username} (${acc.followers} followers)`).join(', ')}`
      ];

      // Generate embeddings and store memories with deduplication
      for (const text of memoryTexts) {
        try {
          const embedding = await generateEmbedding(text);
          await storage.upsertMemory({
            userId,
            content: text,
            embedding,
            metadata: { 
              source: 'instagram_analysis',
              username: username,
              analysisDate: instagramProfile.cached_at
            }
          }, 0.85); // 85% similarity threshold for Instagram memories
        } catch (embeddingError) {
          console.error('Error creating memory embedding:', embeddingError);
        }
      }

      res.json({ 
        profile: instagramProfile,
        cached: false,
        message: 'Instagram profile analyzed successfully'
      });

    } catch (error) {
      console.error('Instagram analysis error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid username format',
          details: error.errors 
        });
      }

      if (error instanceof Error && error.message.includes('User not found')) {
        return res.status(404).json({ 
          error: 'Instagram user not found',
          message: 'The specified Instagram username does not exist or is private'
        });
      }

      if (error instanceof Error && error.message.includes('HikerAPI Error')) {
        return res.status(502).json({ 
          error: 'Instagram API service error',
          message: 'Unable to fetch Instagram data at this time'
        });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to analyze Instagram profile'
      });
    }
  });

  // Get cached Instagram profile
  app.get('/api/instagram/profile/:username', isAuthenticated, async (req: any, res) => {
    try {
      const { username } = req.params;
      const userId = req.user.claims.sub;

      const user = await storage.getUser(userId);
      const profileData = user?.profileData as any;
      
      if (!profileData?.instagramProfile?.username || profileData.instagramProfile.username !== username) {
        return res.status(404).json({ 
          error: 'Profile not found',
          message: 'No cached Instagram profile found for this username'
        });
      }

      res.json({ 
        profile: profileData.instagramProfile,
        cached: true
      });

    } catch (error) {
      console.error('Get Instagram profile error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve Instagram profile'
      });
    }
  });

  // Test HikerAPI connection
  app.get('/api/instagram/test', isAuthenticated, async (req: any, res) => {
    try {
      // Test with a known public Instagram account
      const testUsername = 'instagram'; // Instagram's official account
      const testProfile = await hikerApiService.getUserByUsername(testUsername);
      
      res.json({ 
        success: true,
        message: 'HikerAPI connection successful',
        testData: {
          username: testProfile.username,
          followers: testProfile.follower_count,
          verified: testProfile.is_verified
        }
      });

    } catch (error) {
      console.error('HikerAPI test error:', error);
      res.status(502).json({ 
        success: false,
        error: 'HikerAPI connection failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}