import OpenAI from "openai";
import { type User } from "@shared/schema";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
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
  - businessType (what kind of business/creator they are)
  - contentGoals (array of what they want to achieve)

Return ONLY a JSON object with the fields that were mentioned. If no new info is found, return {}.

Example output:
{
  "firstName": "Sarah",
  "contentNiche": ["fitness", "nutrition"],
  "primaryPlatform": "Instagram",
  "profileData": {
    "targetAudience": "busy professionals",
    "brandVoice": "encouraging but practical"
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
    if (!result) return {};

    try {
      const profileUpdates = JSON.parse(result);
      
      // Only return non-empty updates
      const hasUpdates = Object.keys(profileUpdates).some(key => {
        const value = profileUpdates[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== '';
      });
      
      return hasUpdates ? profileUpdates : {};
    } catch (parseError) {
      console.log('Profile extraction JSON parse error:', parseError);
      return {};
    }
  } catch (error) {
    console.log('Profile extraction error:', error);
    return {};
  }
}