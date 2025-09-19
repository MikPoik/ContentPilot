import OpenAI from "openai";
import { type User } from "@shared/schema";
import { perplexityService } from "../perplexity";
import { buildWorkflowAwareSystemPrompt, decideWorkflowPhase, type WorkflowPhaseDecision } from "./workflow";
import { decideWebSearch, type WebSearchDecision } from "./search";
// Import functions to be used internally

// the newest OpenAI model is "gpt-4.1" which was released May 13, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Together.ai client for gpt-4.1-mini calls to distribute load
const togetherAI = new OpenAI({
  apiKey: process.env.TOGETHERAI_API_KEY || "default_key",
  baseURL: "https://api.together.xyz/v1"
});

// Deepinfra.ai client for embedding calls
const deepinfraAI = new OpenAI({
  apiKey: process.env.DEEPINFRA_API_KEY || "default_key",
  baseURL: "https://api.deepinfra.com/v1/openai"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponseWithMetadata {
  stream: ReadableStream<string>;
  searchPerformed: boolean;
  citations: string[];
  searchQuery?: string;
  workflowDecision?: WorkflowPhaseDecision;
}

export async function generateChatResponse(messages: ChatMessage[], user?: User, memories?: any[]): Promise<ChatResponseWithMetadata> {
  const startTime = Date.now();
  console.log(`🤖 [AI_SERVICE] Building workflow-aware response...`);
  
  // Get workflow phase decision
  const workflowDecision = await decideWorkflowPhase(messages, user);
  console.log(`🔄 [AI_SERVICE] Workflow phase: ${workflowDecision.currentPhase}, block content: ${workflowDecision.shouldBlockContentGeneration}`);
  
  // Use AI-driven search decision system
  let webSearchContext: { context: string; citations: string[] } | undefined = undefined;
  let searchPerformed = false;
  let searchQuery: string | undefined = undefined;

  // Get AI decision on whether to perform web search
  const searchDecision = await decideWebSearch(messages, user);
  console.log(`🧠 [AI_SERVICE] Search decision - shouldSearch: ${searchDecision.shouldSearch}, confidence: ${searchDecision.confidence}, reason: ${searchDecision.reason}`);

  if (perplexityService.isConfigured() && searchDecision.shouldSearch && searchDecision.confidence >= 0.7) {
    try {
      // Fallback to last user message if refinedQuery is empty
      searchQuery = searchDecision.refinedQuery;
      if (!searchQuery.trim() && searchDecision.shouldSearch) {
        // Find the actual last user message by searching backwards through messages
        const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content?.trim() || '';
        if (lastUserMessage) {
          searchQuery = lastUserMessage;
          console.log(`🔍 [AI_SERVICE] Using fallback query from last user message: "${searchQuery}"`);
        } else {
          console.log(`⚠️ [AI_SERVICE] No user message found for fallback, skipping search`);
          searchPerformed = false;
        }
      }
      
      console.log(`🔍 [AI_SERVICE] Performing web search with query: "${searchQuery}"`);
      const searchStart = Date.now();
      searchPerformed = true;
      // searchQuery already set above with fallback logic
      
      // Use the search query with AI decision parameters
      webSearchContext = await perplexityService.searchForChatContext(
        searchQuery,
        "Provide current, relevant information that would help a social media content strategist give accurate advice. Focus on recent trends, current events, or factual data mentioned in the query.",
        searchDecision.recency,
        searchDecision.domains
      );
      
      console.log(`🔍 [AI_SERVICE] Web search completed: ${Date.now() - searchStart}ms (${webSearchContext.citations.length} sources)`);
    } catch (error) {
      console.log(`❌ [AI_SERVICE] Web search failed, continuing without search context:`, error);
      searchPerformed = false;
    }
  } else if (!perplexityService.isConfigured()) {
    console.log(`⚠️ [AI_SERVICE] Perplexity not configured, skipping search despite AI recommendation`);
  } else if (searchDecision.shouldSearch) {
    console.log(`🔍 [AI_SERVICE] AI recommended search but confidence too low (${searchDecision.confidence}), skipping search`);
  }
  
  const promptBuildStart = Date.now();
  const systemPrompt = buildWorkflowAwareSystemPrompt(workflowDecision, user, memories, webSearchContext);
  console.log(`🤖 [AI_SERVICE] Workflow-aware system prompt built: ${Date.now() - promptBuildStart}ms (length: ${systemPrompt.length} chars)`);

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];
  
  console.log(`🤖 [AI_SERVICE] Total messages: ${chatMessages.length}, Total tokens estimate: ${Math.ceil(chatMessages.reduce((acc, msg) => acc + msg.content.length, 0) / 4)}`);

  const openaiRequestStart = Date.now();
  console.log(`🤖 [AI_SERVICE] Sending request to OpenAI...`);
  const stream = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: chatMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });
  console.log(`🤖 [AI_SERVICE] OpenAI stream initialized: ${Date.now() - openaiRequestStart}ms`);

  const responseStream = new ReadableStream({
    async start(controller) {
      let chunkCount = 0;
      let totalContentLength = 0;
      const firstChunkStart = Date.now();
      let firstChunkReceived = false;
      
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            if (!firstChunkReceived) {
              console.log(`🤖 [AI_SERVICE] First chunk received: ${Date.now() - firstChunkStart}ms (TTFB)`);
              firstChunkReceived = true;
            }
            chunkCount++;
            totalContentLength += content.length;
            controller.enqueue(content);
          }
        }
        console.log(`🤖 [AI_SERVICE] Stream completed: ${chunkCount} chunks, ${totalContentLength} chars, total: ${Date.now() - startTime}ms`);
        controller.close();
      } catch (error) {
        console.log(`❌ [AI_SERVICE] Stream error after ${Date.now() - startTime}ms:`, error);
        controller.error(error);
      }
    },
  });

  return {
    stream: responseStream,
    searchPerformed,
    citations: webSearchContext?.citations || [],
    searchQuery,
    workflowDecision
  };
}

export async function generateConversationTitle(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await togetherAI.chat.completions.create({
      model: 'openai-gtp-oss20b',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title for this conversation. Keep it under 50 characters and focus on the main topic or question discussed.'
        },
        {
          role: 'user',
          content: `Conversation:\n${messages.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nGenerate a title:`
        }
      ],
      max_tokens: 20,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content?.trim() || 'New Conversation';
  } catch (error) {
    console.error('Error generating conversation title:', error);
    return 'New Conversation';
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await deepinfraAI.embeddings.create({
      model: "google/embeddinggemma-300m",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// Import and re-export functions for backward compatibility
export async function extractProfileInfo(userMessage: string, assistantResponse: string, user: any): Promise<any> {
  const { extractProfileInfo: extractProfile } = await import('./profile');
  return extractProfile(userMessage, assistantResponse, user);
}

export async function extractMemoriesFromConversation(userMessage: string, assistantResponse: string): Promise<string[]> {
  const { extractMemoriesFromConversation: extractMemories } = await import('./memory');
  return extractMemories(userMessage, assistantResponse);
}