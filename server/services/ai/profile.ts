import OpenAI from "openai";
import { type User } from "@shared/schema";

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1"
});

export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: User): Promise<any> {
  try {
    const response = await togetherAI.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
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
      // Clean and extract JSON from the response
      let sanitizedResult = result.trim();
      
      // Remove code fences if present
      if (sanitizedResult.startsWith('```') && sanitizedResult.endsWith('```')) {
        const lines = sanitizedResult.split('\n');
        sanitizedResult = lines.slice(1, -1).join('\n');
      }
      
      // Remove json language identifier if present
      if (sanitizedResult.startsWith('json\n')) {
        sanitizedResult = sanitizedResult.replace('json\n', '');
      }
      
      sanitizedResult = sanitizedResult.trim();
      
      // Extract first top-level JSON object using bracket scanning
      const firstBraceIndex = sanitizedResult.indexOf('{');
      if (firstBraceIndex !== -1) {
        let braceCount = 0;
        let endIndex = firstBraceIndex;
        
        for (let i = firstBraceIndex; i < sanitizedResult.length; i++) {
          if (sanitizedResult[i] === '{') braceCount++;
          else if (sanitizedResult[i] === '}') braceCount--;
          
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
        
        if (braceCount === 0) {
          sanitizedResult = sanitizedResult.substring(firstBraceIndex, endIndex + 1);
        }
      } else {
        // No JSON found in response, return empty object
        console.log('Profile extraction: No JSON object found in response');
        return {};
      }
      
      const profileUpdates = JSON.parse(sanitizedResult);
      
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
      console.log('Attempted to parse:', result.substring(0, 200) + '...');
      return {};
    }
  } catch (error) {
    console.log('Profile extraction error:', error);
    return {};
  }
}