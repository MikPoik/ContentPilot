import { type User } from "@shared/schema";
import { openai } from "../openai";

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
    profileData: {
      ...(user.profileData as any || {}),
      ...(updates.profileData || {})
    }
  };

  let completedFields = 0;
  const totalFields = 7; // Total profile fields we track

  // Basic info (2 fields)
  if (mergedProfile.firstName) completedFields++;
  if (mergedProfile.lastName) completedFields++;

  // Content niche (1 field)
  if (mergedProfile.contentNiche && mergedProfile.contentNiche.length > 0) completedFields++;

  // Primary platform (1 field)
  if (mergedProfile.primaryPlatform) completedFields++;

  // Profile data sub-fields (3 fields)
  if (mergedProfile.profileData?.targetAudience) completedFields++;
  if (mergedProfile.profileData?.brandVoice) completedFields++;
  if (mergedProfile.profileData?.businessType) completedFields++;

  const percentage = Math.round((completedFields / totalFields) * 100);
  return percentage.toString();
}

export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any> {
  try {
    console.log(`👤 [PROFILE_EXTRACT] Input - User: "${userMessage.substring(0, 100)}..."`);
    console.log(`👤 [PROFILE_EXTRACT] Input - Assistant: "${assistantResponse.substring(0, 100)}..."`);

    const aiPromise = geminiClient.chat.completions.create({
      model: "gemini-2.0-flash-lite", // Faster model for simple decisions
      messages: [
        {
          role: 'system',
          content: `Extract user profile info. Return JSON with only NEW or UPDATED fields:

Fields: firstName, lastName, contentNiche (array), primaryPlatform, profileData: {targetAudience, brandVoice, businessType, contentGoals, blogProfile}

Current profile: ${JSON.stringify({
            firstName: user.firstName,
            lastName: user.lastName,
            contentNiche: user.contentNiche,
            primaryPlatform: user.primaryPlatform,
            profileData: user.profileData
          })}

Return {} if no changes found.`
        },
        {
          role: 'user',
          content: `User: ${userMessage}

AI: ${assistantResponse}

Extract only new/changed info:`
        }
      ],
      max_tokens: 150,
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
      if (cleanResult.startsWith('```') && cleanResult.endsWith('```')) {
        const lines = cleanResult.split('\n');
        cleanResult = lines.slice(1, -1).join('\n');
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