import OpenAI from "openai";
import { type User } from "@shared/schema";
import { hikerApiService } from "../hikerapi.js";
import { storage } from "../../storage.js";
import { generateEmbedding } from "../openai.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export interface InstagramAnalysisDecision {
  shouldAnalyze: boolean;
  username?: string;
  confidence: number;
  reason: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Detects if the user is asking for Instagram profile analysis
 */
export async function decideInstagramAnalysis(
  messages: ChatMessage[],
  user?: User
): Promise<InstagramAnalysisDecision> {
  const startTime = Date.now();
  try {
    console.log(`📸 [INSTAGRAM_AI] Analyzing if user wants Instagram analysis...`);

    // Get last 3 messages for context
    const contextMessages = messages.slice(-3);
    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an Instagram analysis detector. Determine if the user is asking to analyze an Instagram profile.

DETECTION RULES:
- Look for requests to "analyze", "check", "look at", "review" an Instagram account
- Look for Instagram usernames (starting with @ or just mentioning a username)
- Look for requests about Instagram engagement, followers, content style, competitors
- Look for competitor analysis requests like "check my competitor", "analyze [brand name] Instagram", "what's [username] doing"
- Be liberal - if someone mentions wanting insights about an Instagram account, they likely want analysis

Return ONLY valid JSON:
{
  "shouldAnalyze": boolean,
  "username": "extracted username without @ symbol, or null",
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of the decision"
}`
        },
        {
          role: 'user', 
          content: `RECENT CONVERSATION:
${conversationContext}

Should I analyze an Instagram profile based on this conversation?`
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [INSTAGRAM_AI] No response from GPT-4o-mini after ${Date.now() - startTime}ms`);
      return {
        shouldAnalyze: false,
        confidence: 0.0,
        reason: "No response from AI"
      };
    }

    // Parse JSON with robust parsing
    let sanitizedResult = result.trim();

    if (sanitizedResult.startsWith('```') && sanitizedResult.endsWith('```')) {
      const lines = sanitizedResult.split('\n');
      sanitizedResult = lines.slice(1, -1).join('\n');
    }

    if (sanitizedResult.startsWith('json\n')) {
      sanitizedResult = sanitizedResult.replace('json\n', '');
    }

    const decision: InstagramAnalysisDecision = JSON.parse(sanitizedResult.trim());
    console.log(`📸 [INSTAGRAM_AI] Analysis decision: ${Date.now() - startTime}ms - shouldAnalyze: ${decision.shouldAnalyze}, username: ${decision.username}, confidence: ${decision.confidence}`);
    return decision;

  } catch (error) {
    console.error(`❌ [INSTAGRAM_AI] Instagram analysis detection error after ${Date.now() - startTime}ms:`, error);
    return {
      shouldAnalyze: false,
      confidence: 0.0,
      reason: "Error in analysis detection"
    };
  }
}

/**
 * Performs Instagram analysis and returns formatted results for chat
 */
export async function performInstagramAnalysis(
  username: string, 
  userId: string,
  progressCallback?: (message: string) => void
): Promise<{
  success: boolean;
  analysis?: any;
  cached?: boolean;
  error?: string;
  partialSuccess?: boolean;
}> {
  const startTime = Date.now();
  try {
    console.log(`📸 [INSTAGRAM_AI] Performing Instagram analysis for @${username}...`);
    progressCallback?.(`Analyzing @${username} profile...`);

    // Check if profile was analyzed recently (within 24 hours)
    const user = await storage.getUser(userId);
    const existingData = user?.profileData as any;

    // Check user's own profile first
    if (existingData?.instagramProfile?.username === username) {
      const cachedAt = new Date(existingData.instagramProfile.cached_at);
      const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCache < 24) {
        console.log(`📸 [INSTAGRAM_AI] Using cached user profile for @${username} (${hoursSinceCache.toFixed(1)}h old)`);
        return { 
          success: true,
          analysis: existingData.instagramProfile,
          cached: true
        };
      }
    }

    // Check competitor analyses
    if (existingData?.competitorAnalyses?.[username]) {
      const cachedAt = new Date(existingData.competitorAnalyses[username].cached_at);
      const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCache < 24) {
        console.log(`📸 [INSTAGRAM_AI] Using cached competitor analysis for @${username} (${hoursSinceCache.toFixed(1)}h old)`);
        return { 
          success: true,
          analysis: existingData.competitorAnalyses[username],
          cached: true
        };
      }
    }

    // Analyze the Instagram profile using HikerAPI
    progressCallback?.(`Fetching profile data and posts...`);
    const instagramProfile = await hikerApiService.analyzeInstagramProfile(username);
    
    // Check if we got partial results (main profile succeeded but some similar accounts failed)
    const partialSuccess = instagramProfile.similar_accounts.length === 0 && instagramProfile.followers > 0;

    // Determine if this is the user's own profile or a competitor analysis
    const profileData = user?.profileData as any;

    // If profileData is null/undefined or no existing Instagram profile, treat this as the user's main profile
    const isOwnProfile = !profileData || !profileData.instagramProfile;

    // Store the Instagram profile data appropriately
    let updatedProfileData;
    if (isOwnProfile) {
      // Store as the user's main Instagram profile
      updatedProfileData = {
        ...existingData,
        instagramProfile,
        ownInstagramUsername: username
      };

      // Migration: If this profile was previously stored in competitorAnalyses, remove it
      if (existingData?.competitorAnalyses?.[username]) {
        const { [username]: removedProfile, ...remainingCompetitors } = existingData.competitorAnalyses;
        updatedProfileData.competitorAnalyses = remainingCompetitors;
        console.log(`📸 [INSTAGRAM_AI] Migrated @${username} from competitor analysis to main profile`);
      }
    } else {
      // Store competitor analyses separately without overwriting user's profile
      const competitorAnalyses = existingData?.competitorAnalyses || {};
      competitorAnalyses[username] = instagramProfile;

      updatedProfileData = {
        ...existingData,
        competitorAnalyses
      };
    }

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

    console.log(`📸 [INSTAGRAM_AI] Instagram analysis completed: ${Date.now() - startTime}ms`);
    return { 
      success: true,
      analysis: instagramProfile,
      cached: false,
      partialSuccess: partialSuccess
    };

  } catch (error) {
    console.error(`❌ [INSTAGRAM_AI] Instagram analysis failed for @${username} after ${Date.now() - startTime}ms:`, error);

    let errorMessage = 'Failed to analyze Instagram profile';
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        errorMessage = 'Instagram user not found or account is private';
      } else if (error.message.includes('HikerAPI Error')) {
        errorMessage = 'Instagram API service temporarily unavailable';
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Formats Instagram analysis results for display in chat
 */
export function formatInstagramAnalysisForChat(analysis: any, cached: boolean = false): string {
  if (!analysis) return "Unable to retrieve Instagram analysis.";

  const cacheIndicator = cached ? " (from recent analysis)" : "";

  return `📸 **Instagram Analysis for @${analysis.username}**${cacheIndicator}

👥 **Audience & Reach:**
• ${analysis.followers.toLocaleString()} followers
• ${analysis.following.toLocaleString()} following  
• ${analysis.posts.toLocaleString()} posts

📊 **Engagement Insights:**
• ${analysis.engagement_rate.toFixed(2)}% engagement rate
• ${Math.round(analysis.avg_likes).toLocaleString()} avg likes per post
• ${Math.round(analysis.avg_comments).toLocaleString()} avg comments per post

🏷️ **Top Hashtags:**
${analysis.top_hashtags.slice(0, 5).map(tag => `#${tag}`).join(' • ')}

🎯 **Content Style:**
${analysis.post_texts.slice(0, 2).map(text => `"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`).join('\n')}

👥 **Similar Accounts:**
${analysis.similar_accounts.slice(0, 3).map(acc => `@${acc.username} (${acc.followers.toLocaleString()} followers)`).join(' • ')}

${analysis.biography ? `\n📝 **Bio:** ${analysis.biography}` : ''}`;
}