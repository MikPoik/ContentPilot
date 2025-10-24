import { type User } from "@shared/schema";
import { openai } from "../openai";
import OpenAI from "openai";

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function extractProfileInfo(
  userMessage: string, 
  assistantResponse: string, 
  user: User,
  context?: {
    blogAnalysisPerformed?: boolean;
    instagramAnalysisPerformed?: boolean;
  }
): Promise<any> {
  try {
    console.log(`👤 [PROFILE_EXTRACT] Input - User: "${userMessage.substring(0, 100)}..."`);
    console.log(`👤 [PROFILE_EXTRACT] Input - Assistant: "${assistantResponse.substring(0, 100)}..."`);

    // Use analysis flags instead of keyword matching for better detection
    const isBlogAnalysis = context?.blogAnalysisPerformed || false;
    const isInstagramAnalysis = context?.instagramAnalysisPerformed || false;

    const response = await geminiClient.chat.completions.create({
      model: "gemini-2.5-flash-lite", // Faster model for simple decisions
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

EXTRACTION GUIDELINES - BE HIGHLY SELECTIVE AND CONSERVATIVE:

ONLY EXTRACT IN THESE SPECIFIC CASES:
1. Explicit profile update request: "Update my profile", "Change my business type to X", "My name is Y"
2. NEW concrete business information NOT already captured in profile
3. Major corrections to existing incorrect information
4. Concrete business details discovered through external analysis (website, Instagram, blog) that are NOT duplicates

DO NOT EXTRACT:
- Casual conversation about business without new concrete data
- Content ideas or suggestions (not profile data)
- Information already present in profile (even if rephrased)
- Minor variations or subcategories of existing contentNiche items
- Generic acknowledgments or questions
- Vague statements like "I want to grow my business" (no specific data)
- Discussion of content strategies (unless explicitly updating goals)

CONTENT NICHE RULES (VERY STRICT):
- Only add if it's a genuinely different field/industry NOT already covered
- Don't add subcategories: "weight training" when "fitness" exists
- Don't add variations: "mental wellness" when "mental health" exists
- Don't add method variations: "couples therapy" when "therapy" and "relationship coaching" exist
- STRICT LIMIT: Maximum 10 items total
- When at limit, DO NOT extract any new niches

DUPLICATE PREVENTION (CRITICAL):
- For arrays: Only add truly NEW items not semantically covered by existing entries
- Check if new item is a variation/subset of existing items
- For brandVoice: "warm" is duplicate of "warm and approachable"
- For contentNiche: "startup consulting" is duplicate of "business consulting" + "startups"
- For targetAudience: "young professionals" is duplicate of "professionals aged 25-35"

SPECIAL HANDLING FOR EXPLICIT UPDATE REQUESTS:
- When user explicitly asks to update specific fields, ALWAYS extract those changes
- For platform updates: normalize and capitalize (["Instagram", "TikTok"])
- Set primaryPlatform to first item for backward compatibility
- Be more liberal only for explicit requests, not casual mentions

EXTRACTION SOURCES PRIORITY:
1. USER MESSAGE: Only explicit new business info or update requests
2. ASSISTANT RESPONSE ANALYSIS RESULTS: Only concrete discoveries from external sources
3. DO NOT extract from: AI suggestions, content ideas, general advice, questions

INSTAGRAM PROFILE EXTRACTION RULES (WHEN instagramAnalysisPerformed=true):
- Extract contentNiche from top hashtags if NOT already covered (max 2-3 new items)
- Extract businessType from bio/category if missing and clearly stated
- Only extract if adding genuinely NEW information not in current profile
- Only extract if Instagram data is NEW and provides information not already in profile

FIELD USAGE RULES:
- businessLocation: For physical business address/location
- businessType: For services offered/industry
- blogProfile: NEVER modify - reserved for blog content analysis only
- targetAudience: Maximum 5 items (keep most relevant)
- contentGoals: Maximum 5 items (keep most relevant)
- brandVoice: Maximum 5 descriptors (keep most distinctive)

CURRENT USER PROFILE FOR COMPARISON:
- contentNiche: ${user.contentNiche?.join(', ') || 'Not set'}
- primaryPlatform(s): ${((user as any).primaryPlatforms?.join(', ')) || user.primaryPlatform || 'Not set'}
- targetAudience: ${(user.profileData as any)?.targetAudience || 'Not set'}
- businessType: ${(user.profileData as any)?.businessType || 'Not set'}
- businessLocation: ${(user.profileData as any)?.businessLocation || 'Not set'}

${isBlogAnalysis ? `
⚠️ BLOG ANALYSIS CONTEXT - BE EXTRA CONSERVATIVE:
Blog analysis was just performed. The assistant response already contains structured blog data.
DO NOT extract profile information that duplicates or rephrases existing profile data.
ONLY extract if there are completely new business facts not previously known.
` : ''}
${isInstagramAnalysis ? `
⚠️ INSTAGRAM ANALYSIS CONTEXT - EXTRACT BUSINESS INSIGHTS:
Instagram analysis was just performed. Extract relevant business insights like:
- Content niche from top hashtags and themes
- Brand voice from content style patterns
- Target audience from engagement and follower data
- Business type from bio or category information
ONLY extract NEW information not already in the profile.
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

      let profileUpdates = JSON.parse(cleanResult);
      console.log(`👤 [PROFILE_EXTRACT] Parsed updates:`, profileUpdates);

      // Normalize AI output formats: some models return fields wrapped like { added: [...] }
      // or single-value fields. Convert them to the expected shapes used elsewhere.
      try {
        // Normalize top-level contentNiche
        if (profileUpdates.contentNiche && typeof profileUpdates.contentNiche === 'object' && !Array.isArray(profileUpdates.contentNiche)) {
          if (Array.isArray(profileUpdates.contentNiche.added)) {
            profileUpdates.contentNiche = profileUpdates.contentNiche.added;
          } else {
            // If it's an object with other keys, attempt to extract arrays
            const vals = Object.values(profileUpdates.contentNiche).flat().filter(Boolean);
            profileUpdates.contentNiche = vals.length > 0 ? vals : profileUpdates.contentNiche;
          }
        }

        // Normalize profileData nested fields
        if (profileUpdates.profileData && typeof profileUpdates.profileData === 'object') {
          const pd = profileUpdates.profileData;
          for (const key of Object.keys(pd)) {
            const val = pd[key];
            // If field is wrapped like { added: [...] }, unwrap
            if (val && typeof val === 'object' && !Array.isArray(val) && Array.isArray(val.added)) {
              pd[key] = val.added;
            }

            // If field is a single string, convert to array for consistent handling of array-limited fields
            if (typeof pd[key] === 'string') {
              pd[key] = [pd[key]];
            }
          }
          profileUpdates.profileData = pd;
        }
      } catch (normErr) {
        console.log('👤 [PROFILE_EXTRACT] Normalization error (continuing):', normErr);
      }

      // Track capped fields for user feedback
      const cappedFields: { field: string; limit: number; attempted: number }[] = [];

      // Enforce contentNiche limit of 10 items
      if (profileUpdates.contentNiche && Array.isArray(profileUpdates.contentNiche)) {
        const currentNiches = user.contentNiche || [];
        const combinedNiches = [...new Set([...currentNiches, ...profileUpdates.contentNiche])];
        
        if (combinedNiches.length > 10) {
          const remainingSlots = 10 - currentNiches.length;
          const attemptedToAdd = profileUpdates.contentNiche.length;
          
          if (remainingSlots > 0) {
            profileUpdates.contentNiche = profileUpdates.contentNiche.slice(0, remainingSlots);
          } else {
            delete profileUpdates.contentNiche;
          }
          
          cappedFields.push({ 
            field: 'Content Niche', 
            limit: 10, 
            attempted: currentNiches.length + attemptedToAdd 
          });
          console.log(`👤 [PROFILE_EXTRACT] ContentNiche at limit (10), restricting new additions`);
        }
      }

      // Enforce profileData array limits
      if (profileUpdates.profileData) {
        const currentProfileData = (user.profileData as any) || {};
        
        // targetAudience limit: 5 items
        if (profileUpdates.profileData.targetAudience) {
          const current = Array.isArray(currentProfileData.targetAudience) ? currentProfileData.targetAudience : [];
          const combined = [...new Set([...current, ...profileUpdates.profileData.targetAudience])];
          if (combined.length > 5) {
            const remainingSlots = 5 - current.length;
            const attemptedToAdd = profileUpdates.profileData.targetAudience.length;
            
            profileUpdates.profileData.targetAudience = remainingSlots > 0 
              ? profileUpdates.profileData.targetAudience.slice(0, remainingSlots)
              : [];
            
            cappedFields.push({ 
              field: 'Target Audience', 
              limit: 5, 
              attempted: current.length + attemptedToAdd 
            });
            console.log(`👤 [PROFILE_EXTRACT] TargetAudience at limit (5), restricting additions`);
          }
        }
        
        // contentGoals limit: 5 items
        if (profileUpdates.profileData.contentGoals) {
          const current = Array.isArray(currentProfileData.contentGoals) ? currentProfileData.contentGoals : [];
          const combined = [...new Set([...current, ...profileUpdates.profileData.contentGoals])];
          if (combined.length > 5) {
            const remainingSlots = 5 - current.length;
            const attemptedToAdd = profileUpdates.profileData.contentGoals.length;
            
            profileUpdates.profileData.contentGoals = remainingSlots > 0
              ? profileUpdates.profileData.contentGoals.slice(0, remainingSlots)
              : [];
            
            cappedFields.push({ 
              field: 'Content Goals', 
              limit: 5, 
              attempted: current.length + attemptedToAdd 
            });
            console.log(`👤 [PROFILE_EXTRACT] ContentGoals at limit (5), restricting additions`);
          }
        }
        
        // brandVoice limit: 5 items
        if (profileUpdates.profileData.brandVoice) {
          const voices = Array.isArray(profileUpdates.profileData.brandVoice) 
            ? profileUpdates.profileData.brandVoice 
            : [profileUpdates.profileData.brandVoice];
          const current = Array.isArray(currentProfileData.brandVoice) 
            ? currentProfileData.brandVoice 
            : (currentProfileData.brandVoice ? [currentProfileData.brandVoice] : []);
          const combined = [...new Set([...current, ...voices])];
          if (combined.length > 5) {
            const remainingSlots = 5 - current.length;
            const attemptedToAdd = voices.length;
            
            profileUpdates.profileData.brandVoice = remainingSlots > 0
              ? voices.slice(0, remainingSlots)
              : [];
            
            cappedFields.push({ 
              field: 'Brand Voice', 
              limit: 5, 
              attempted: current.length + attemptedToAdd 
            });
            console.log(`👤 [PROFILE_EXTRACT] BrandVoice at limit (5), restricting additions`);
          }
        }
      }

      // Add capped fields metadata to profileData for user feedback
      if (cappedFields.length > 0) {
        if (!profileUpdates.profileData) {
          profileUpdates.profileData = {};
        }
        profileUpdates.profileData._cappedFields = cappedFields;
      }

      // Only return non-empty updates
      const hasUpdates = Object.keys(profileUpdates).some(key => {
        const value = profileUpdates[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== '';
      });

      console.log(`👤 [PROFILE_EXTRACT] Has updates: ${hasUpdates}`);

      if (hasUpdates) {
        // Profile completeness will be calculated and cached in storage.updateUserProfile
        console.log(`👤 [PROFILE_EXTRACT] Final result:`, profileUpdates);
        return profileUpdates;
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
