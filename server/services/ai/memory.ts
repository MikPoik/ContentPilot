import OpenAI from "openai";

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1",
});

// Together.ai client for gpt-4.1-mini calls to distribute load
const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "default_key",
});

// Together.ai client for gpt-4.1-mini calls to distribute load
const deepinfraAI = new OpenAI({
  apiKey: process.env.DEEPINFRA_API_KEY || "default_key",
  baseURL: "https://api.deepinfra.com/v1/openai",
});
export async function rephraseQueryForEmbedding(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  user?: any,
): Promise<string> {
  const startTime = Date.now();
  try {
    console.log(`🔄 [AI_SERVICE] Rephrasing query for embedding search...`);

    // Build conversation context from recent messages
    const contextMessages = conversationHistory
      .slice(-6) // Last 6 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Build user context
    let userContext = "";
    if (user) {
      userContext = `User Profile:
- Name: ${user.firstName || "Not provided"}${user.lastName ? " " + user.lastName : ""}
- Content Niche: ${user.contentNiche?.join(", ") || "Not specified"}
- Primary Platform: ${user.primaryPlatform || "Not specified"}`;

      if (user.profileData) {
        const data = user.profileData as any;
        if (data.targetAudience)
          userContext += `\n- Target Audience: ${data.targetAudience}`;
        if (data.businessType)
          userContext += `\n- Business Type: ${data.businessType}`;
      }
    }

    const response = await deepinfraAI.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are a query rephrasing assistant for memory search. Your job is to rephrase the user's latest message into a better search query that will find relevant memories from past conversations.

IMPORTANT RULES:
1. Expand abbreviations and make implicit concepts explicit
2. Add relevant context from conversation history when it clarifies the query
3. Include synonyms and related terms that might be in stored memories
4. Keep the rephrased query focused and concise (1-2 sentences max)
5. If the query is already clear and specific, return it unchanged
6. Focus on the semantic meaning and intent, not just keywords

Examples:
- "How do I post more?" → "How to increase posting frequency and maintain consistency on social media platforms"
- "That didn't work" → "Content strategy or posting approach that was unsuccessful or didn't generate expected results"
- "What about Instagram?" → "Instagram-specific content strategies, posting tips, and platform best practices"

Return ONLY the rephrased query text, nothing else.`,
        },
        {
          role: "user",
          content: `${userContext ? userContext + "\n\n" : ""}Recent Conversation Context:
${contextMessages}

Latest User Message to Rephrase: "${userMessage}"

Rephrase this query for better memory search:`,
        },
      ],
      max_tokens: 100,
      temperature: 0.1,
    });

    const rephrasedQuery =
      response.choices[0]?.message?.content?.trim() || userMessage;
    console.log(
      `🔄 [AI_SERVICE] Query rephrasing completed: ${Date.now() - startTime}ms`,
    );
    return rephrasedQuery;
  } catch (error) {
    console.error(
      `❌ [AI_SERVICE] Query rephrasing error after ${Date.now() - startTime}ms:`,
      error,
    );
    // Fallback to original query on error
    return userMessage;
  }
}

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
): Promise<string[]> {
  try {
    const response = await openAI.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
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
["User prefers short-form video content over carousel posts", "Their audience responds well to behind-the-scenes content", "They want to avoid overly promotional content"]`,
        },
        {
          role: "user",
          content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
        },
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
      if (cleanResult.startsWith("```") && cleanResult.endsWith("```")) {
        const lines = cleanResult.split("\n");
        cleanResult = lines.slice(1, -1).join("\n");
      }

      // Remove any "json" prefix
      if (cleanResult.startsWith("json\n")) {
        cleanResult = cleanResult.replace("json\n", "");
      }

      // Find the JSON array bounds
      const firstBracketIndex = cleanResult.indexOf("[");
      const lastBracketIndex = cleanResult.lastIndexOf("]");

      if (
        firstBracketIndex !== -1 &&
        lastBracketIndex !== -1 &&
        lastBracketIndex > firstBracketIndex
      ) {
        cleanResult = cleanResult.substring(
          firstBracketIndex,
          lastBracketIndex + 1,
        );
      }

      // Fix common JSON issues
      cleanResult = cleanResult
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\n/g, " ") // Replace literal \n with spaces
        .replace(/\\"/g, '"') // Fix escaped quotes
        .replace(/"\s*,\s*]/g, '"]') // Fix trailing commas before closing bracket
        .replace(/,\s*]/g, "]"); // Remove trailing commas

      const memories = JSON.parse(cleanResult);
      return Array.isArray(memories)
        ? memories.filter((m) => typeof m === "string" && m.length > 0)
        : [];
    } catch (parseError) {
      console.log("Memory extraction JSON parse error:", parseError);
      console.log("Raw result:", result);

      // Fallback: try to extract strings manually using regex
      try {
        const stringMatches = result.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
        if (stringMatches) {
          const extractedStrings = stringMatches
            .map((match) => match.slice(1, -1)) // Remove quotes
            .filter((str) => str.length > 10 && str.length < 200) // Reasonable memory length
            .slice(0, 5); // Max 5 memories

          console.log(
            "Fallback extraction found:",
            extractedStrings.length,
            "memories",
          );
          return extractedStrings;
        }
      } catch (fallbackError) {
        console.log("Fallback extraction also failed:", fallbackError);
      }

      return [];
    }
  } catch (error) {
    console.log("Memory extraction error:", error);
    return [];
  }
}
