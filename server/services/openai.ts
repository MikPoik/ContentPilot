import OpenAI from "openai";
import logger from "../logger";

// Centralized OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "default_key",
});

const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "default_key",
  baseURL:"https://generativelanguage.googleapis.com/v1beta/openai"
});

// Export the centralized client for use by other modules
export { openai };

// Centralized embedding function
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await geminiClient.embeddings.create({
      model: "gemini-embedding-001",
      input: text,
      dimensions: 1536,
    });
    logger.log(
      `🧠 [AI_SERVICE] Embedding generated: ${response.data[0].embedding.length} dimensions`,
    );
    return response.data[0].embedding;
  } catch (error) {
    logger.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Batch embedding generation - much faster than sequential calls
 * Use this when you need embeddings for multiple texts at once
 * 
 * @param texts - Array of texts to embed (max 100 recommended)
 * @returns Array of embeddings in same order as input texts
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  if (texts.length === 1) {
    // Single text - use regular function
    const embedding = await generateEmbedding(texts[0]);
    return [embedding];
  }

  try {
    const startTime = Date.now();
    
    // Batch API call - much more efficient than sequential calls
    const response = await geminiClient.embeddings.create({
      model: "gemini-embedding-001",
      input: texts, // Send all texts at once
      dimensions: 1536,
    });
    
    const embeddings = response.data.map(item => item.embedding);
    const duration = Date.now() - startTime;
    
    logger.log(
      `🧠 [AI_SERVICE] Batch embeddings generated: ${embeddings.length} embeddings in ${duration}ms (${(duration / embeddings.length).toFixed(1)}ms per embedding)`
    );
    
    return embeddings;
  } catch (error) {
    logger.error("Error generating batch embeddings:", error);
    
    // Fallback: generate embeddings one by one if batch fails
    logger.log("🔄 [AI_SERVICE] Falling back to sequential embedding generation...");
    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const embedding = await generateEmbedding(text);
        embeddings.push(embedding);
      } catch (err) {
        logger.error(`Failed to generate embedding for text: ${text.substring(0, 50)}...`, err);
        throw err;
      }
    }
    return embeddings;
  }
}

// Legacy compatibility exports - all functionality has been moved to modular services
export { generateChatResponse, generateConversationTitle, extractProfileInfo, extractMemoriesFromConversation, type ChatResponseWithMetadata } from "./ai/chat";
export type { WorkflowPhaseDecision, WebSearchDecision } from "./ai/intent";