import OpenAI from "openai";
import { type User, type InstagramHashtagResult } from "@shared/schema";
import { hikerApiService } from "../hikerapi.js";
import { instagrapiService } from "../instagrapi.js";
import { storage } from "../../storage.js";
import { generateEmbedding } from "../openai.js";
import {
  ChatMessage,
  InstagramAnalysisDecision,
  InstagramHashtagDecision,
  safeJsonParse
} from "./intent";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

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

    // Get last 1 messages for context
    const contextMessages = messages.slice(-2);
    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
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


RECENT CONVERSATION:
${conversationContext}


Return ONLY valid JSON:
{
  "shouldAnalyze": boolean,
  "username": "extracted username without @ symbol, or null",
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of the decision"
}`
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
    progressCallback?.(`🔍 Analyzing @${username} profile...`);

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
    progressCallback?.(`📊 Fetching profile data and posts...`);
    const instagramProfile = await hikerApiService.analyzeInstagramProfile(username);

    // Check if we got partial results (main profile succeeded but some similar accounts failed)
    const partialSuccess = instagramProfile.similar_accounts.length === 0 && instagramProfile.followers > 0;

    // Determine if this is the user's own profile or a competitor analysis
    const profileData = user?.profileData as any;
    const existingProfileData = profileData || {};

    // Check if this username matches any existing profile data to avoid overwriting
    const existingInstagramUsername = existingProfileData?.instagramProfile?.username;
    const existingOwnUsername = existingProfileData?.ownInstagramUsername;

    // Only treat as own profile if:
    // 1. This username matches the existing ownInstagramUsername, OR  
    // 2. This username matches the existing instagramProfile username, OR
    // 3. No existing Instagram profile AND no existing own username (first time setup)
    const isOwnProfile = (existingOwnUsername === username) ||
                        (existingInstagramUsername === username) ||
                        (!existingProfileData.instagramProfile && !existingProfileData.ownInstagramUsername);

    // Store the Instagram profile data appropriately
    let updatedProfileData;
    if (isOwnProfile) {
      // Store as the user's main Instagram profile, preserving all existing data
      updatedProfileData = {
        ...existingProfileData,
        instagramProfile,
        ownInstagramUsername: username
      };

      // Migration: If this profile was previously stored in competitorAnalyses, remove it
      if (existingProfileData?.competitorAnalyses?.[username]) {
        const { [username]: removedProfile, ...remainingCompetitors } = existingProfileData.competitorAnalyses;
        updatedProfileData.competitorAnalyses = remainingCompetitors;
        console.log(`📸 [INSTAGRAM_AI] Migrated @${username} from competitor analysis to main profile`);
      }
    } else {
      // Store as competitor analysis, preserving all existing profile data
      const competitorAnalyses = existingProfileData?.competitorAnalyses || {};
      competitorAnalyses[username] = instagramProfile;

      updatedProfileData = {
        ...existingProfileData,
        competitorAnalyses
      };
    }

    await storage.updateUserProfile(userId, {
      profileData: updatedProfileData
    });

    // Create memory entries for key insights with sanitized content
      const sanitizedPostSamples = instagramProfile.post_texts
        .slice(0, 3) // Take only first 3 posts
        .map(text => {
          // Remove contact details, links, and repetitive content
          let clean = text
            .replace(/📞\d+/g, '') // Remove phone numbers
            .replace(/📨\S+@\S+/g, '') // Remove emails
            .replace(/www\.\S+/g, '') // Remove websites
            .replace(/https?:\/\/\S+/g, '') // Remove URLs
            .replace(/⭐+/g, '') // Remove star bullets
            .replace(/👉/g, '') // Remove pointing emojis
            .split('|')[0] // Take only first part if pipe-separated
            .trim();

          // Truncate to max 150 characters and add ellipsis if needed
          return clean.length > 200 ? clean.substring(0, 200) + '...' : clean;
        })
        .filter(text => text.length > 20); // Only keep meaningful samples

      const memoryTexts = [
        `Instagram profile analysis for ${username}: ${instagramProfile.followers} followers, ${instagramProfile.engagement_rate.toFixed(2)}% engagement rate`,
        `Top hashtags for ${username}: ${instagramProfile.top_hashtags.join(', ')}`,
        sanitizedPostSamples.length > 0 ? `Content style samples for ${username}: ${sanitizedPostSamples.join(' | ')}` : `Content style for ${username}: ${instagramProfile.top_hashtags.slice(0, 3).join(', ')} focused content`,
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
    
    // Return flag indicating new analysis data is available for profile extraction
    return {
      success: true,
      analysis: instagramProfile,
      cached: false,
      partialSuccess: partialSuccess,
      shouldExtractProfile: true // Signal that profile extraction should run
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
 * Detects if the user is asking for Instagram hashtag search
 */
export async function decideInstagramHashtagSearch(
  messages: ChatMessage[],
  user?: User
): Promise<InstagramHashtagDecision> {
  const startTime = Date.now();
  try {
    console.log(`🏷️ [INSTAGRAM_HASHTAG] Analyzing if user wants hashtag search...`);

    // Get last 2 messages for context
    const contextMessages = messages.slice(-2);
    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Build user's available hashtags for suggestions (excluding their own handle)
    let userHashtagContext = '';
    if (user?.profileData) {
      const profileData = user.profileData as any;
      
      // Get hashtags from Instagram profile, excluding the user's own username
      let availableHashtags: string[] = [];
      
      if (profileData.instagramProfile?.top_hashtags) {
        const userHandle = profileData.instagramProfile.username?.toLowerCase();
        availableHashtags = profileData.instagramProfile.top_hashtags.filter((tag: string) => 
          tag.toLowerCase() !== userHandle
        );
      }

      if (availableHashtags.length > 0) {
        userHashtagContext = `\n\nUSER'S TOP HASHTAGS (available for suggestions): ${availableHashtags.slice(0, 8).join(', ')}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are an Instagram hashtag search detector. Determine if the user is asking to search for hashtag content for ideas or inspiration.

DETECTION RULES:
- Look for hashtag mentions (like #fitness, #marketing, #travel)
- Look for requests for "hashtag ideas", "content inspiration", "show me posts about X"
- Look for requests to "get ideas from hashtag", "see what's trending in #hashtag"
- Look for content research requests by hashtag for inspiration
- Be liberal - if someone asks for ideas related to a topic that could be a hashtag, they likely want hashtag search
- If no specific hashtag is mentioned but user asks for ideas, suggest from their top hashtags${userHashtagContext}

RECENT CONVERSATION:
${conversationContext}

Return ONLY valid JSON:
{
  "shouldSearch": boolean,
  "hashtag": "extracted hashtag without # symbol, or suggested from user's top hashtags if no specific one mentioned",
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation of the decision"
}`
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      console.log(`❌ [INSTAGRAM_HASHTAG] No response from GPT-4o-mini after ${Date.now() - startTime}ms`);
      return {
        shouldSearch: false,
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

    const decision: InstagramHashtagDecision = JSON.parse(sanitizedResult.trim());
    console.log(`🏷️ [INSTAGRAM_HASHTAG] Hashtag search decision: ${Date.now() - startTime}ms - shouldSearch: ${decision.shouldSearch}, hashtag: ${decision.hashtag}, confidence: ${decision.confidence}`);
    return decision;

  } catch (error) {
    console.error(`❌ [INSTAGRAM_HASHTAG] Instagram hashtag search detection error after ${Date.now() - startTime}ms:`, error);
    return {
      shouldSearch: false,
      confidence: 0.0,
      reason: "Error in hashtag search detection"
    };
  }
}

/**
 * Performs Instagram hashtag search and returns formatted results for chat
 */
export async function performInstagramHashtagSearch(
  hashtag: string,
  userId: string,
  progressCallback?: (message: string) => void
): Promise<{
  success: boolean;
  hashtagResult?: InstagramHashtagResult;
  cached?: boolean;
  error?: string;
  shouldExtractProfile?: boolean;
}> {
  const startTime = Date.now();
  try {
    console.log(`🏷️ [INSTAGRAM_HASHTAG] Performing hashtag search for #${hashtag}...`);
    progressCallback?.(`🔍 Searching #${hashtag} for content ideas...`);

    // Check if hashtag was searched recently (within 6 hours)
    const user = await storage.getUser(userId);
    const existingData = user?.profileData as any;

    if (existingData?.hashtagSearches?.[hashtag]) {
      const cachedAt = new Date(existingData.hashtagSearches[hashtag].cached_at);
      const hoursSinceCache = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCache < 6) {
        console.log(`🏷️ [INSTAGRAM_HASHTAG] Using cached hashtag search for #${hashtag} (${hoursSinceCache.toFixed(1)}h old)`);
        return {
          success: true,
          hashtagResult: existingData.hashtagSearches[hashtag],
          cached: true
        };
      }
    }

    // Search for hashtag content using HikerAPI
    progressCallback?.(`📊 Fetching trending posts for #${hashtag}...`);
    const hashtagResult = await hikerApiService.searchHashtag(hashtag, 12);

    // Store the hashtag search results in user's profileData with limit of 20 searches
    const existingSearches = existingData?.hashtagSearches || {};
    const searchEntries = Object.entries(existingSearches);
    
    // If we're at the limit (20 searches), remove the oldest one
    if (searchEntries.length >= 20 && !existingSearches[hashtag]) {
      // Sort by cached_at date and remove oldest
      searchEntries.sort(([, a]: [string, any], [, b]: [string, any]) => 
        new Date(a.cached_at).getTime() - new Date(b.cached_at).getTime()
      );
      const [oldestKey] = searchEntries[0];
      delete existingSearches[oldestKey];
      console.log(`🏷️ [INSTAGRAM_HASHTAG] Removed oldest hashtag search: #${oldestKey} (limit: 20)`);
    }
    
    const updatedProfileData = {
      ...existingData,
      hashtagSearches: {
        ...existingSearches,
        [hashtag]: hashtagResult
      }
    };

    await storage.updateUserProfile(userId, {
      profileData: updatedProfileData
    });

    // Create memory entries for hashtag insights
    const topPosts = hashtagResult.posts.slice(0, 5);
    const memoryTexts = [
      `Instagram hashtag search for #${hashtag}: Found ${hashtagResult.total_posts} trending posts with high engagement`,
      `Top content themes for #${hashtag}: ${topPosts.map(p => p.username).join(', ')} are creating popular content`,
      topPosts.length > 0 ? `Popular post examples for #${hashtag}: ${topPosts.map(p => `${p.username} (${p.like_count} likes)`).join(', ')}` : `Hashtag #${hashtag} content analyzed`
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
            source: 'hashtag_search',
            hashtag: hashtag,
            searchDate: hashtagResult.cached_at
          }
        }, 0.80); // 80% similarity threshold for hashtag memories
      } catch (embeddingError) {
        console.error('Error creating hashtag memory embedding:', embeddingError);
      }
    }

    console.log(`🏷️ [INSTAGRAM_HASHTAG] Hashtag search completed: ${Date.now() - startTime}ms`);
    return {
      success: true,
      hashtagResult: hashtagResult,
      cached: false
    };

  } catch (error) {
    console.error(`❌ [INSTAGRAM_HASHTAG] Hashtag search failed for #${hashtag} after ${Date.now() - startTime}ms:`, error);

    let errorMessage = 'Failed to search Instagram hashtag';
    if (error instanceof Error) {
      if (error.message.includes('InstagrapiAPI Error')) {
        errorMessage = 'Instagram hashtag search service temporarily unavailable';
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
${analysis.top_hashtags.slice(0, 5).map((tag: string) => `#${tag}`).join(' • ')}

🎯 **Content Style:**
${analysis.post_texts.slice(0, 2).map((text: string) => `"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`).join('\n')}

👥 **Similar Accounts:**
${analysis.similar_accounts.slice(0, 3).map((acc: { username: string; followers: number }) => `@${acc.username} (${acc.followers.toLocaleString()} followers)`).join(' • ')}

${analysis.biography ? `\n📝 **Bio:** ${analysis.biography}` : ''}`;
}

/**
 * Formats Instagram hashtag search results for display in chat
 */
export function formatInstagramHashtagSearchForChat(hashtagResult: InstagramHashtagResult, cached: boolean = false): string {
  if (!hashtagResult || hashtagResult.posts.length === 0) {
    return "Unable to retrieve hashtag content or no posts found for this hashtag.";
  }

  const cacheIndicator = cached ? " (from recent search)" : "";
  const topPosts = hashtagResult.posts.slice(0, 8);

  return `🏷️ **Hashtag Content Ideas: #${hashtagResult.hashtag}**${cacheIndicator}

🔥 **Top Performing Posts:**
${topPosts.map((post, index) => {
  const engagement = post.like_count + post.comment_count;
  const truncatedCaption = post.caption ? 
    (post.caption.length > 80 ? post.caption.substring(0, 80) + '...' : post.caption) : 
    'No caption';
  
  return `**${index + 1}.** @${post.username} (${engagement.toLocaleString()} total engagement)
   "${truncatedCaption}"
   👍 ${post.like_count.toLocaleString()} likes • 💬 ${post.comment_count.toLocaleString()} comments`;
}).join('\n\n')}

💡 **Content Inspiration Ideas:**
• **Engagement leaders:** ${topPosts.slice(0, 3).map(p => `@${p.username}`).join(', ')} are getting high engagement
• **Content variety:** Mix of ${Array.from(new Set(topPosts.map(p => p.media_type === 1 ? 'photos' : p.media_type === 2 ? 'videos' : 'carousels'))).join(' and ')}
• **Posting patterns:** Active creators include ${Array.from(new Set(topPosts.map(p => p.username))).slice(0, 4).join(', ')}

🎯 **Your Content Strategy:**
Consider creating content that resonates with the #${hashtagResult.hashtag} community by studying these high-performing examples!`;
}