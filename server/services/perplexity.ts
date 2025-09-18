import { ChatMessage } from "./openai";

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface WebSearchResult {
  content: string;
  citations: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Perplexity service for web search capabilities
 * 
 * This service provides web search functionality through Perplexity's API,
 * which can answer questions with real-time information from the web.
 */
export class PerplexityService {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ [PERPLEXITY] PERPLEXITY_API_KEY not set. Web search functionality will be disabled.');
    }
  }

  /**
   * Check if the service is configured and ready to use
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Perform a web search query using Perplexity
   * 
   * @param query - The search query or question to ask
   * @param options - Optional configuration for the search
   */
  async search(
    query: string, 
    options?: {
      model?: 'llama-3.1-sonar-small-128k-online' | 'llama-3.1-sonar-large-128k-online' | 'llama-3.1-sonar-huge-128k-online';
      temperature?: number;
      maxTokens?: number;
      searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year';
      searchDomainFilter?: string[];
      returnRelatedQuestions?: boolean;
      systemPrompt?: string;
    }
  ): Promise<WebSearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Perplexity service not configured. Please set PERPLEXITY_API_KEY environment variable.');
    }

    const startTime = Date.now();
    console.log(`🔍 [PERPLEXITY] Starting web search query: "${query}"`);

    try {
      const messages: PerplexityMessage[] = [];
      
      // Add system prompt if provided
      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt
        });
      }

      // Add user query
      messages.push({
        role: 'user',
        content: query
      });

      const requestBody = {
        model: options?.model || 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: options?.maxTokens || undefined,
        temperature: options?.temperature ?? 0.2,
        top_p: 0.9,
        search_domain_filter: options?.searchDomainFilter || undefined,
        return_images: false,
        return_related_questions: options?.returnRelatedQuestions ?? false,
        search_recency_filter: options?.searchRecencyFilter || 'month',
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      };

      console.log(`🔍 [PERPLEXITY] Request config: model=${requestBody.model}, temperature=${requestBody.temperature}, recency=${requestBody.search_recency_filter}`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [PERPLEXITY] API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      console.log(`🔍 [PERPLEXITY] Search completed: ${Date.now() - startTime}ms, ${data.citations?.length || 0} citations`);

      return {
        content: data.choices[0]?.message?.content || '',
        citations: data.citations || [],
        usage: data.usage
      };

    } catch (error) {
      console.error(`❌ [PERPLEXITY] Search error after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Search for information and format it for use in chat context
   * 
   * @param query - The search query
   * @param contextPrompt - How to format the results for chat context
   * @param recency - Time recency filter for search results
   * @param domains - Domain filter for search results
   */
  async searchForChatContext(
    query: string,
    contextPrompt: string = "Provide a concise summary of the most relevant and current information.",
    recency?: 'hour' | 'day' | 'week' | 'month' | 'year',
    domains?: string[]
  ): Promise<{ context: string; citations: string[] }> {
    const result = await this.search(query, {
      systemPrompt: contextPrompt,
      temperature: 0.1,
      searchRecencyFilter: recency || 'week',
      searchDomainFilter: domains?.length ? domains : undefined
    });

    return {
      context: result.content,
      citations: result.citations
    };
  }

  /**
   * Check if a query likely needs web search (contains current events, specific facts, etc.)
   * 
   * @param query - The user query to analyze
   */
  shouldUseWebSearch(query: string): boolean {
    const webSearchIndicators = [
      // Current events and time-sensitive queries
      /\b(today|now|current|latest|recent|new|2024|2025)\b/i,
      /\b(this (year|month|week)|last (year|month|week))\b/i,
      
      // Factual queries that might need current data
      /\b(price|cost|stock|market|news|weather)\b/i,
      /\b(who is|what is|where is|when is|how much)\b/i,
      
      // Company/product specific queries
      /\b(company|startup|business|product|service)\b/i,
      
      // Statistics and data
      /\b(statistics|data|numbers|percentage|rate)\b/i,
      
      // Questions about specific people, places, events
      /\b(CEO|founder|headquarters|launched|released)\b/i
    ];

    return webSearchIndicators.some(pattern => pattern.test(query));
  }
}

// Export a singleton instance
export const perplexityService = new PerplexityService();

// Export types for use in other modules
export type { WebSearchResult, PerplexityMessage };