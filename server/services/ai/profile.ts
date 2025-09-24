import { type User } from "@shared/schema";
import { openai } from "../openai";
import OpenAI from "openai";

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

function calculateProfileCompleteness(user: User, updates: any): string {
  // Create a merged profile to calculate completeness
  const mergedProfile = {
    firstName: updates.firstName || user.firstName,
    lastName: updates.lastName || user.lastName,
    contentNiche: updates.contentNiche || user.contentNiche || [],
    primaryPlatform: updates.primaryPlatform || user.primaryPlatform,
    primaryPlatforms: (updates as any).primaryPlatforms || (user as any).primaryPlatforms || [],
    profileData: {
      ...(user.profileData as any || {}),
      ...(updates.profileData || {})
    }
  };

  let completedFields = 0;
  const totalFields = 10; // Updated total profile fields we track

  // Basic info (2 fields) - Weight: 20%
  if (mergedProfile.firstName) completedFields++;
  if (mergedProfile.lastName) completedFields++;

  // Content niche (1 field) - Weight: 10%
  if (mergedProfile.contentNiche && mergedProfile.contentNiche.length > 0) completedFields++;

  // Primary platform(s) (1 field) - Weight: 10%
  if (mergedProfile.primaryPlatform || (mergedProfile as any).primaryPlatforms?.length > 0) completedFields++;

  // Core profile data (3 fields) - Weight: 30%
  if (mergedProfile.profileData?.targetAudience) completedFields++;
  if (mergedProfile.profileData?.brandVoice) completedFields++;
  if (mergedProfile.profileData?.businessType) completedFields++;

  // Enhanced profile data (3 fields) - Weight: 30%
  if (mergedProfile.profileData?.contentGoals?.length > 0) completedFields++;
  if (mergedProfile.profileData?.businessLocation) completedFields++;
  
  // Rich analysis data - if either Instagram or blog analysis exists, count as complete
  const hasInstagramAnalysis = !!(mergedProfile.profileData?.instagramProfile?.username);
  const hasBlogAnalysis = !!(mergedProfile.profileData?.blogProfile?.writingStyle);
  const hasCompetitorAnalysis = !!(mergedProfile.profileData?.competitorAnalyses && 
    Object.keys(mergedProfile.profileData.competitorAnalyses).length > 0);
  
  if (hasInstagramAnalysis || hasBlogAnalysis || hasCompetitorAnalysis) {
    completedFields++;
  }

  const percentage = Math.round((completedFields / totalFields) * 100);
  return percentage.toString();
}

export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any> {
  try {
    console.log(`👤 [PROFILE_EXTRACT] Input - User: "${userMessage.substring(0, 100)}..."`);
    console.log(`👤 [PROFILE_EXTRACT] Input - Assistant: "${assistantResponse.substring(0, 100)}..."`);

    // Check if blog analysis was just performed - if so, be extra conservative about extracting profile data
    const isBlogAnalysis = assistantResponse.includes('Blog Content Analysis') || 
                          assistantResponse.includes('blogProfile') ||
                          userMessage.includes('blogi') ||
                          userMessage.includes('/blog');

    const response = await geminiClient.chat.completions.create({
      model: "gemini-2.0-flash-lite", // Faster model for simple decisions
      messages: [
        {
          role: 'system',
          content: `Extract user profile info from both user message AND assistant response. Return JSON emphasizing any CHANGED or NEW fields:

Fields to consider: firstName, lastName, contentNiche (array), primaryPlatforms (array like ["Instagram","TikTok"]), primaryPlatform (string, optional legacy primary), profileData: {targetAudience, brandVoice, businessType, contentGoals, businessLocation}

IMPORTANT: Do NOT modify blogProfile - it's reserved for blog content analysis only.

Current profile: ${JSON.stringify({
            firstName: user.firstName,
            lastName: user.lastName,
            contentNiche: user.contentNiche,
            primaryPlatform: user.primaryPlatform,
            primaryPlatforms: (user as any).primaryPlatforms,
            profileData: user.profileData
          })}

EXTRACTION GUIDELINES - BE MORE SELECTIVE:

ONLY EXTRACT SIGNIFICANT PROFILE CHANGES:
1. NEW business information not already in the profile
2. MAJOR corrections or updates to existing information
3. CONCRETE business details discovered through analysis (website, Instagram, etc.)
4. EXPLICIT user statements about their business/goals that ADD new information
5. EXPLICIT profile update requests (like "update my profile")

DO NOT EXTRACT:
- Minor variations of existing contentNiche items ()
- Repeated information already in the profile
- General conversation topics that don't add new profile data
- Content ideas or recommendations without explicit user adoption
- Sub-topics or variations of existing niches unless they represent a completely different field

SPECIAL HANDLING FOR EXPLICIT UPDATE REQUESTS:
- When user explicitly asks to update profile information, ALWAYS extract the requested changes
- For platform updates: if user mentions multiple platforms (e.g., "Instagram and TikTok"), set primaryPlatforms to a normalized distinct array (capitalize first letter). Also set primaryPlatform to the first item for backward compatibility.
- For explicit requests, be more liberal with extraction than normal discovery

CONTENT NICHE RULES:
- Only add new contentNiche items if they represent a genuinely different field/industry
- If the new topic is a subcategory or variation of an existing niche, DO NOT extract it
- Example: If user has "fitness", don't add "weight training" (it's the same field)
- Keep total items in contentNiche to 10 or fewer

DUPLICATE PREVENTION:
- For arrays (contentNiche, targetAudience, brandVoice, contentGoals): Only add items that aren't already covered by existing entries
- For brandVoice: Don't add similar descriptions like "warm" if "warm and approachable" already exists
- For contentNiche: Don't add multiple therapy variations if therapy categories already exist
- When blog analysis has just been performed, focus ONLY on truly new business information

EXTRACTION SOURCES:
1. USER MESSAGE: Only extract if user explicitly states NEW business info, goals, or major changes
2. ASSISTANT RESPONSE: Only extract from website/Instagram analysis or other concrete business discoveries, avoiding duplicates of recent analysis results

FIELD USAGE RULES:
- businessLocation: For physical business address/location
- businessType: For services offered/industry
- blogProfile: NEVER modify - reserved for blog content analysis only

CURRENT USER PROFILE FOR COMPARISON:
- contentNiche: ${user.contentNiche?.join(', ') || 'Not set'}
- primaryPlatform(s): ${((user as any).primaryPlatforms?.join(', ')) || user.primaryPlatform || 'Not set'}
- targetAudience: ${(user.profileData as any)?.targetAudience || 'Not set'}
- businessType: ${(user.profileData as any)?.businessType || 'Not set'}
- businessLocation: ${(user.profileData as any)?.businessLocation || 'Not set'}

${isBlogAnalysis ? `
⚠️ BLOG ANALYSIS CONTEXT - BE EXTRA CONSERVATIVE:
This conversation involves blog analysis. The assistant response already contains structured blog data.
DO NOT extract profile information that duplicates or rephrases existing profile data.
ONLY extract if there are completely new business facts not previously known.
` : ''}

ONLY extract if there's genuinely NEW or SIGNIFICANTLY DIFFERENT information.`
        },
        {
          role: 'user',
          content: `User message: ${userMessage}

Assistant response: ${assistantResponse}

Extract new/changed BUSINESS info from both sources, focusing on factual discoveries about the user's business.`
        }
      ],
      max_tokens:1000,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    console.log(`👤 [PROFILE_EXTRACT] Raw AI response: "${result}"`);

    if (!result) {
      console.log(`👤 [PROFILE_EXTRACT] No response from AI model`);
      return {};
    }

    try {
      // Clean up the result to handle code fences and other formatting
      let cleanResult = result.trim();

      // Remove code fences if present
      if (cleanResult.startsWith('```')) {
        const lines = cleanResult.split('\n');
        // Find the first line that contains JSON (starts with {)
        let startIndex = 1;
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim().startsWith('{')) {
            startIndex = i;
            break;
          }
        }
        // Find the last line that contains JSON (ends with })
        let endIndex = lines.length - 1;
        for (let i = lines.length - 2; i >= 0; i--) {
          if (lines[i].trim().endsWith('}')) {
            endIndex = i;
            break;
          }
        }
        cleanResult = lines.slice(startIndex, endIndex + 1).join('\n');
      }

      // Remove json language identifier if present
      if (cleanResult.startsWith('json\n')) {
        cleanResult = cleanResult.replace('json\n', '');
      }

      cleanResult = cleanResult.trim();

      // Extract first top-level JSON object using bracket scanning
      const firstBraceIndex = cleanResult.indexOf('{');
      if (firstBraceIndex !== -1) {
        let braceCount = 0;
        let endIndex = firstBraceIndex;

        for (let i = firstBraceIndex; i < cleanResult.length; i++) {
          if (cleanResult[i] === '{') braceCount++;
          else if (cleanResult[i] === '}') braceCount--;

          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }

        if (braceCount === 0) {
          cleanResult = cleanResult.substring(firstBraceIndex, endIndex + 1);
        }
      }

      const profileUpdates = JSON.parse(cleanResult);
      console.log(`👤 [PROFILE_EXTRACT] Parsed updates:`, profileUpdates);


      // Only return non-empty updates
      const hasUpdates = Object.keys(profileUpdates).some(key => {
        const value = profileUpdates[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== '';
      });

      console.log(`👤 [PROFILE_EXTRACT] Has updates: ${hasUpdates}`);

      if (hasUpdates) {
        // Calculate and add profile completeness
        const profileCompleteness = calculateProfileCompleteness(user, profileUpdates);
        const finalResult = {
          ...profileUpdates,
          profileCompleteness
        };
        console.log(`👤 [PROFILE_EXTRACT] Final result with ${profileCompleteness}% completeness:`, finalResult);
        return finalResult;
      }

      console.log(`👤 [PROFILE_EXTRACT] No updates to return`);
      return {};
    } catch (parseError) {
      console.log(`❌ [PROFILE_EXTRACT] JSON parse error:`, parseError);
      console.log(`❌ [PROFILE_EXTRACT] Raw result that failed to parse: "${result}"`);
      return {};
    }
  } catch (error) {
    console.log(`❌ [PROFILE_EXTRACT] API error:`, error);
    return {};
  }
}
