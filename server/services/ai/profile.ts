import { type User } from "@shared/schema";
import { openai } from "../openai";

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: 'system',
          content: `Extract user profile information from this conversation exchange. Look for:
- firstName, lastName (if mentioned)
- contentNiche (array of topics/industries they create content about)
- primaryPlatform (main social media platform they focus on)
- profileData object with:
  - targetAudience (who they're trying to reach)
  - brandVoice (their communication style)
  - businessType (what kind of business/creator they are - look for mentions like "I run a X business", "I'm a therapist", "I own a restaurant", etc.)
  - contentGoals (array of what they want to achieve)
  - blogProfile (object with blog analysis data):
    - writingStyle (formal, conversational, academic, personal, etc.)
    - averagePostLength (short, medium, long)
    - commonTopics (array of frequent blog themes)
    - toneKeywords (array of emotional/descriptive words)
    - postingFrequency (if mentioned)
    - blogUrl (if mentioned)

IMPORTANT:
- Pay special attention to business type information
- Look for blog-related mentions like "my blog", "I write about", "blog posts", website URLs
- Extract blog analysis results if the assistant analyzed blog content

User:
 ${userMessage}

A:
${assistantResponse}

Return ONLY a JSON object with the fields that were mentioned. If no new info is found, return {}.

Example outputs:
{
  "firstName": "User",
  "contentNiche": ["wellness", "lifestyle"],
  "primaryPlatform": "Instagram",
  "profileData": {
    "targetAudience": "working professionals",
    "brandVoice": "supportive and practical",
    "blogProfile": {
      "writingStyle": "conversational",
      "averagePostLength": "medium",
      "commonTopics": ["wellness tips", "lifestyle advice"],
      "toneKeywords": ["supportive", "practical", "encouraging"]
    }
  }
}

{
  "profileData": {
    "businessType": "consulting business"
  }
}`
        }
      ],
      max_tokens: 300,
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