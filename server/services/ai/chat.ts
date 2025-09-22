import OpenAI from "openai";
import { type User } from "@shared/schema";
import { perplexityService } from "../perplexity";
import { grokService } from "../grok";
import {
  buildWorkflowAwareSystemPrompt,
  decideWorkflowPhase,
  type WorkflowPhaseDecision,
} from "./workflow";
import { decideWebSearch, type WebSearchDecision } from "./search";
// Import functions to be used internally

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_ENV_VAR ||
    "default_key",
});

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1",
});

// Deepinfra.ai client for embedding calls
const deepinfraAI = new OpenAI({
  apiKey: process.env.DEEPINFRA_API_KEY || "default_key",
  baseURL: "https://api.deepinfra.com/v1/openai",
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponseWithMetadata {
  stream: ReadableStream<string>;
  searchPerformed: boolean;
  citations: string[];
  searchQuery?: string;
  workflowDecision?: WorkflowPhaseDecision;
}

export async function generateChatResponse(
  messages: ChatMessage[],
  user?: User,
  memories?: any[],
  searchDecision?: WebSearchDecision,
  instagramAnalysisResult?: { analysis: any; cached: boolean; error?: string },
): Promise<ChatResponseWithMetadata> {
  const startTime = Date.now();
  console.log(`🤖 [AI_SERVICE] Building workflow-aware response...`);

  // Get workflow phase decision
  const workflowDecision = await decideWorkflowPhase(messages, user);
  console.log(
    `🔄 [AI_SERVICE] Workflow phase: ${workflowDecision.currentPhase}, block content: ${workflowDecision.shouldBlockContentGeneration}`,
  );

  // Use search decision from caller (routes layer)
  let webSearchContext: { context: string; citations: string[] } | undefined =
    undefined;
  let searchPerformed = false;
  let searchQuery: string | undefined = undefined;

  // Use the search decision passed from the routes layer
  if (searchDecision) {
    console.log(
      `🧠 [AI_SERVICE] Using search decision - shouldSearch: ${searchDecision.shouldSearch}, confidence: ${searchDecision.confidence}, reason: ${searchDecision.reason}`,
    );

    // Always set searchQuery if AI recommended search, even if we don't execute it
    if (searchDecision.shouldSearch) {
      searchQuery = searchDecision.refinedQuery?.trim() || 
        messages
          .slice()
          .reverse()
          .find((m) => m.role === "user")
          ?.content?.trim() || "";
    }
  }

  if (
    searchDecision &&
    searchDecision.shouldSearch &&
    searchDecision.confidence >= 0.7
  ) {
    try {
      console.log(
        `🔍 [AI_SERVICE] Performing ${searchDecision.searchService} search with query: "${searchQuery}"`,
      );
      const searchStart = Date.now();
      searchPerformed = true;

      if (searchDecision.searchService === 'grok' && grokService.isConfigured()) {
        webSearchContext = await grokService.searchForChatContext(
          searchQuery || "",
          "Provide current, relevant social media information that would help a content strategist give accurate advice. Focus on recent trends, social media discussions, and real-time insights.",
          searchDecision.socialHandles
        );
      } else if (perplexityService.isConfigured()) {
        // Use Perplexity as fallback or when explicitly chosen
        webSearchContext = await perplexityService.searchForChatContext(
          searchQuery || "",
          "Provide current, relevant information that would help a social media content strategist give accurate advice. Focus on recent trends, current events, or factual data mentioned in the query.",
          searchDecision.recency,
          searchDecision.domains,
        );
      } else {
        throw new Error(`${searchDecision.searchService} service not configured`);
      }

      console.log(
        `🔍 [AI_SERVICE] ${searchDecision.searchService} search completed: ${Date.now() - searchStart}ms (${webSearchContext.citations.length} sources)`,
      );
      
      // Even if no sources found, we still performed a search
      if (webSearchContext.citations.length === 0) {
        console.log(`⚠️ [AI_SERVICE] Web search returned no results, but search was attempted`);
      }
    } catch (error) {
      console.log(
        `❌ [AI_SERVICE] ${searchDecision.searchService} search failed, continuing without search context:`,
        error,
      );
      searchPerformed = false;
    }
  } else if (searchDecision?.shouldSearch && !perplexityService.isConfigured() && !grokService.isConfigured()) {
    console.log(
      `⚠️ [AI_SERVICE] No search services configured, skipping search despite AI recommendation`,
    );
  } else if (searchDecision?.shouldSearch) {
    console.log(
      `🔍 [AI_SERVICE] AI recommended search but confidence too low (${searchDecision.confidence}), skipping search`,
    );
  }

  const promptBuildStart = Date.now();
  const systemPrompt = buildWorkflowAwareSystemPrompt(
    workflowDecision,
    user,
    memories,
    webSearchContext,
    instagramAnalysisResult,
  );
  console.log(
    `🤖 [AI_SERVICE] Workflow-aware system prompt built: ${Date.now() - promptBuildStart}ms (length: ${systemPrompt.length} chars)`,
  );

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  console.log(
    `🤖 [AI_SERVICE] Total messages: ${chatMessages.length}, Total tokens estimate: ${Math.ceil(chatMessages.reduce((acc, msg) => acc + msg.content.length, 0) / 4)}`,
  );

  const openaiRequestStart = Date.now();
  console.log(`🤖 [AI_SERVICE] Sending request to OpenAI...`);
  const stream = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: chatMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });
  console.log(
    `🤖 [AI_SERVICE] OpenAI stream initialized: ${Date.now() - openaiRequestStart}ms`,
  );

  const responseStream = new ReadableStream({
    async start(controller) {
      let chunkCount = 0;
      let totalContentLength = 0;
      const firstChunkStart = Date.now();
      let firstChunkReceived = false;

      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            if (!firstChunkReceived) {
              console.log(
                `🤖 [AI_SERVICE] First chunk received: ${Date.now() - firstChunkStart}ms (TTFB)`,
              );
              firstChunkReceived = true;
            }
            chunkCount++;
            totalContentLength += content.length;
            controller.enqueue(content);
          }
        }
        console.log(
          `🤖 [AI_SERVICE] Stream completed: ${chunkCount} chunks, ${totalContentLength} chars, total: ${Date.now() - startTime}ms`,
        );
        controller.close();
      } catch (error) {
        console.log(
          `❌ [AI_SERVICE] Stream error after ${Date.now() - startTime}ms:`,
          error,
        );
        controller.error(error);
      }
    },
  });

  return {
    stream: responseStream,
    searchPerformed,
    citations: webSearchContext?.citations || [],
    searchQuery,
    workflowDecision,
  };
}

export async function generateConversationTitle(
  messages: ChatMessage[],
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a concise, descriptive title for this conversation. Keep it under 50 characters and focus on the main topic or question discussed.",
        },
        {
          role: "user",
          content: `Conversation:\n${messages
            .slice(0, 4)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n\nGenerate a title:`,
        },
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content?.trim() || "New Conversation";
  } catch (error) {
    console.error("Error generating conversation title:", error);
    return "New Conversation";
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await deepinfraAI.embeddings.create({
      model: "Qwen/Qwen3-Embedding-8B",
      input: text,
      encoding_format: "float",
      dimensions: 1536,
    });
    console.log(
      `🧠 [AI_SERVICE] Embedding generated: ${response.data[0]} dimensions`,
    );
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Import and re-export functions for backward compatibility
export async function extractProfileInfo(
  userMessage: string,
  assistantResponse: string,
  user: any,
): Promise<any> {
  const { extractProfileInfo: extractProfile } = await import("./profile");
  return extractProfile(userMessage, assistantResponse, user);
}

export async function extractMemoriesFromConversation(
  userMessage: string,
  assistantResponse: string,
  existingMemories?: Array<{ content: string; similarity?: number }>,
): Promise<string[]> {
  const { extractMemoriesFromConversation: extractMemories } = await import(
    "./memory"
  );
  return extractMemories(userMessage, assistantResponse, existingMemories);
}
