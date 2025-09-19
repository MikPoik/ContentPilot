import OpenAI from "openai";
import { type User } from "@shared/schema";

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1"
});

export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any> {
  try {
    console.log(`👤 [PROFILE_EXTRACT] Input - User: "${userMessage.substring(0, 100)}..."`);
    console.log(`👤 [PROFILE_EXTRACT] Input - Assistant: "${assistantResponse.substring(0, 100)}..."`);
    
    const response = await togetherAI.chat.completions.create({
      model: 'openai/gpt-oss-20b',
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

IMPORTANT: Pay special attention to business type information. If someone mentions running any type of business, being a professional, or their occupation, capture it as businessType.

Return ONLY a JSON object with the fields that were mentioned. If no new info is found, return {}.

Example outputs:
{
  "firstName": "Sarah",
  "contentNiche": ["fitness", "nutrition"],
  "primaryPlatform": "Instagram",
  "profileData": {
    "targetAudience": "busy professionals",
    "brandVoice": "encouraging but practical"
  }
}

{
  "profileData": {
    "businessType": "therapy business"
  }
}`
        },
        {
          role: 'user',
          content: `User: ${userMessage}`
        },
        {
          role: 'assistant',
          content: assistantResponse
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    console.log(`👤 [PROFILE_EXTRACT] Raw AI response: "${result}"`);
    
    if (!result) {
      console.log(`👤 [PROFILE_EXTRACT] No response from AI model`);
      return {};
    }

    try {
      const profileUpdates = JSON.parse(result);
      console.log(`👤 [PROFILE_EXTRACT] Parsed updates:`, profileUpdates);
      
      // Only return non-empty updates
      const hasUpdates = Object.keys(profileUpdates).some(key => {
        const value = profileUpdates[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== '';
      });
      
      console.log(`👤 [PROFILE_EXTRACT] Has updates: ${hasUpdates}`);
      const finalResult = hasUpdates ? profileUpdates : {};
      console.log(`👤 [PROFILE_EXTRACT] Final result:`, finalResult);
      
      return finalResult;
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