import OpenAI from "openai";

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1"
});

export async function extractMemoriesFromConversation(userMessage: string, assistantResponse: string): Promise<string[]> {
  try {
    const response = await togetherAI.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `Extract important facts, preferences, and context from this conversation that should be remembered for future interactions.

Focus on:
- User's specific preferences and dislikes
- Important personal or business context
- Decisions they've made about content strategy
- Successful approaches that worked for them
- Key insights about their audience or niche

Return an array of concise memory statements (1-2 sentences each). Each memory should be self-contained and useful for future conversations.

Return ONLY a JSON array of strings. If no memorable information, return [].

Example output:
["User prefers short-form video content over carousel posts", "Their audience responds well to behind-the-scenes content", "They want to avoid overly promotional content"]`
        },
        {
          role: 'user',
          content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) return [];

    try {
      const memories = JSON.parse(result);
      return Array.isArray(memories) ? memories.filter(m => typeof m === 'string' && m.length > 0) : [];
    } catch (parseError) {
      console.log('Memory extraction JSON parse error:', parseError);
      return [];
    }
  } catch (error) {
    console.log('Memory extraction error:', error);
    return [];
  }
}