import { type User } from "@shared/schema";
import { perplexityService } from "../perplexity";
import { grokService } from "../grok";
import { openai } from "../openai";
import {
  buildWorkflowAwareSystemPrompt,
} from "./workflow";
import { 
  type WebSearchDecision,
  type WorkflowPhaseDecision,
  type ChatMessage
} from "./intent";
// Import functions to be used internally


// Note: DeepInfra usage eliminated - moved to OpenAI for consistency


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
  relevantMemories: any[] = [],
  searchDecision?: any,
  instagramAnalysisResult?: any,
  instagramHashtagResult?: any,
  blogAnalysisResult?: any,
  workflowDecision?: WorkflowPhaseDecision
): Promise<ChatResponseWithMetadata> {
  const startTime = Date.now();
  console.log(`🤖 [AI_SERVICE] Building workflow-aware response...`);

  // Use workflow phase decision from caller (unified intent analysis)
  if (!workflowDecision) {
    // Fallback for backward compatibility - shouldn't happen in normal operation
    console.warn(`⚠️ [AI_SERVICE] No workflow decision provided, this shouldn't happen with unified intent system`);
    workflowDecision = {
      currentPhase: "Discovery & Personalization",
      missingFields: ["name", "niche", "platform"],
      readyToAdvance: false,
      suggestedPrompts: ["What's your name?", "What type of content do you create?"],
      profilePatch: {},
      shouldBlockContentGeneration: true,
      confidence: 0.9
    };
  }

  console.log(
    `🔄 [AI_SERVICE] Using workflow phase: ${workflowDecision.currentPhase}, block content: ${workflowDecision.shouldBlockContentGeneration}`,
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
          searchDecision.domains
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
  const systemPrompt = await buildWorkflowAwareSystemPrompt(
    workflowDecision,
    user,
    relevantMemories,
    webSearchContext,
    instagramAnalysisResult,
  );
  console.log(
    `🤖 [AI_SERVICE] Workflow-aware system prompt built: ${Date.now() - promptBuildStart}ms (length: ${systemPrompt.length} chars)`,
  );

  // Add blog analysis result to context if available
  let finalSystemPrompt = systemPrompt;
  if (blogAnalysisResult?.success && blogAnalysisResult.analysis) {
    const { formatBlogAnalysisForChat } = await import('./blog.js');
    finalSystemPrompt += `\n\n=== RECENT BLOG ANALYSIS ===\n${formatBlogAnalysisForChat(blogAnalysisResult.analysis, blogAnalysisResult.cached)}`;
  }
  //console.log(`🤖 [AI_SERVICE] Final system prompt length: ${finalSystemPrompt}`)
  // Add hashtag search result to context if available
  if (instagramHashtagResult?.success && instagramHashtagResult.hashtagResult) {
    const { formatInstagramHashtagSearchForChat } = await import('./instagram.js');
    finalSystemPrompt += `\n\n=== RECENT INSTAGRAM HASHTAG SEARCH ===\n${formatInstagramHashtagSearchForChat(instagramHashtagResult.hashtagResult, instagramHashtagResult.cached)}`;
  }


  const chatMessages: ChatMessage[] = [
    { role: "system", content: finalSystemPrompt },
    ...messages.slice(-20),
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
      model: "gpt-4.1-nano",
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