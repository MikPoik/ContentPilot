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
      // Clean up the result before parsing
      let cleanResult = result.trim();
      
      // Remove any markdown code blocks
      if (cleanResult.startsWith('```') && cleanResult.endsWith('```')) {
        const lines = cleanResult.split('\n');
        cleanResult = lines.slice(1, -1).join('\n');
      }
      
      // Remove any "json" prefix
      if (cleanResult.startsWith('json\n')) {
        cleanResult = cleanResult.replace('json\n', '');
      }
      
      // Find the JSON array bounds
      const firstBracketIndex = cleanResult.indexOf('[');
      const lastBracketIndex = cleanResult.lastIndexOf(']');
      
      if (firstBracketIndex !== -1 && lastBracketIndex !== -1 && lastBracketIndex > firstBracketIndex) {
        cleanResult = cleanResult.substring(firstBracketIndex, lastBracketIndex + 1);
      }
      
      // Fix common JSON issues
      cleanResult = cleanResult
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\\n/g, ' ') // Replace literal \n with spaces
        .replace(/\\"/g, '"') // Fix escaped quotes
        .replace(/"\s*,\s*]/g, '"]') // Fix trailing commas before closing bracket
        .replace(/,\s*]/g, ']'); // Remove trailing commas
      
      const memories = JSON.parse(cleanResult);
      return Array.isArray(memories) ? memories.filter(m => typeof m === 'string' && m.length > 0) : [];
    } catch (parseError) {
      console.log('Memory extraction JSON parse error:', parseError);
      console.log('Raw result:', result);
      
      // Fallback: try to extract strings manually using regex
      try {
        const stringMatches = result.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
        if (stringMatches) {
          const extractedStrings = stringMatches
            .map(match => match.slice(1, -1)) // Remove quotes
            .filter(str => str.length > 10 && str.length < 200) // Reasonable memory length
            .slice(0, 5); // Max 5 memories
          
          console.log('Fallback extraction found:', extractedStrings.length, 'memories');
          return extractedStrings;
        }
      } catch (fallbackError) {
        console.log('Fallback extraction also failed:', fallbackError);
      }
      
      return [];
    }
  } catch (error) {
    console.log('Memory extraction error:', error);
    return [];
  }
}