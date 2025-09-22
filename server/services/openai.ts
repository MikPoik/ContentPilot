import OpenAI from "openai";

// Centralized OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "default_key",
});

// Export the centralized client for use by other modules
export { openai };

// Centralized embedding function
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536,
    });
    console.log(
      `🧠 [AI_SERVICE] Embedding generated: ${response.data[0].embedding.length} dimensions`,
    );
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Legacy compatibility exports - all functionality has been moved to modular services
export { generateChatResponse, generateConversationTitle, extractProfileInfo, extractMemoriesFromConversation, type ChatResponseWithMetadata } from "./ai/chat";
export type { WorkflowPhaseDecision, WebSearchDecision } from "./ai/intent";