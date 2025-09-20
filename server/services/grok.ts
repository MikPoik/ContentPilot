import OpenAI from "openai";
import { WebSearchResult } from "./perplexity";

interface GrokSearchParameters {
  mode: 'on' | 'off' | 'auto';
  sources?: Array<{
    type: 'x' | 'web' | 'news';
    included_x_handles?: string[];
    excluded_x_handles?: string[];
    post_favorite_count?: number;
    post_view_count?: number;
  }>;
  max_search_results?: number;
  return_citations?: boolean;
}

interface CacheEntry {
  context: string;
  citations: string[];
  timestamp: number;
  lastAccessed: number;
}

/**
 * Grok service for social media and real-time web search capabilities
 * 
 * This service provides web search functionality through Grok's API,
 * which can search Twitter/X and provide real-time social media information.
 */
export class GrokService {
  private client: OpenAI;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (shorter for real-time data)
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    const apiKey = process.env.XAI_API_KEY || '';
    if (!apiKey) {
      console.warn('⚠️ [GROK] XAI_API_KEY not set. Grok search functionality will be disabled.');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  /**
   * Check if the service is configured and ready to use
   */
  isConfigured(): boolean {
    return !!process.env.XAI_API_KEY;
  }

  /**
   * Generate cache key for a query and search parameters
   */
  private generateCacheKey(query: string, searchParams?: GrokSearchParameters): string {
    const normQuery = query.trim().toLowerCase().replace(/:/g, '_');
    const paramsHash = searchParams ? this.simpleHash(JSON.stringify(searchParams)) : 'default';
    return `${normQuery}|${paramsHash}`;
  }

  /**
   * Simple hash function for search parameters
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL_MS;
  }

  /**
   * Get cached result if available and valid
   */
  private getCachedResult(cacheKey: string): { context: string; citations: string[] } | null {
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
      cachedEntry.lastAccessed = Date.now();
      console.log(`📦 [GROK CACHE] Cache HIT for key: ${cacheKey}`);
      return {
        context: cachedEntry.context,
        citations: cachedEntry.citations
      };
    }
    
    if (cachedEntry) {
      this.cache.delete(cacheKey);
    }
    
    console.log(`❌ [GROK CACHE] Cache MISS for key: ${cacheKey}`);
    return null;
  }

  /**
   * Store result in cache
   */
  private setCachedResult(cacheKey: string, context: string, citations: string[]): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(cacheKey, {
      context,
      citations,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
    console.log(`💾 [GROK CACHE] Cached result for key: ${cacheKey}`);
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Perform a search using Grok with optional social media parameters
   */
  async search(
    query: string,
    options?: {
      socialHandles?: string[];
      excludeHandles?: string[];
      minFavorites?: number;
      minViews?: number;
      systemPrompt?: string;
    }
  ): Promise<WebSearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Grok service not configured. Please set XAI_API_KEY environment variable.');
    }

    const startTime = Date.now();
    console.log(`🔍 [GROK] Starting search query: "${query}"`);

    try {
      const searchParams: GrokSearchParameters = {
        mode: 'on',
        sources: [{
          type: 'x',
          included_x_handles: options?.socialHandles && options.socialHandles.length > 0 ? options.socialHandles : undefined,
          excluded_x_handles: options?.excludeHandles && options.excludeHandles.length > 0 ? options.excludeHandles : undefined,
          post_favorite_count: options?.minFavorites || 10,
          post_view_count: options?.minViews || 100,
        }],
        max_search_results: 10,
        return_citations: true
      };

      const response = await this.client.chat.completions.create({
        model: 'grok-4-fast',
        messages: [
          ...(options?.systemPrompt ? [{
            role: 'system' as const,
            content: options.systemPrompt
          }] : []),
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        // @ts-ignore - Grok-specific search parameters
        search_parameters: searchParams
      });

      const content = response.choices[0]?.message?.content || '';
      console.log(`🔍 [GROK] Search completed: ${Date.now() - startTime}ms`);

      // Extract citations from content and usage data
      const citations = this.extractCitations(content, response.usage);

      // Log response details for debugging
      console.log(`🔍 [GROK] Response content length: ${content.length}, citations found: ${citations.length}`);
      if (response.usage && 'num_sources_used' in response.usage) {
        console.log(`🔍 [GROK] API reported ${(response.usage as any).num_sources_used} sources used`);
      }

      return {
        content,
        citations,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined
      };

    } catch (error) {
      console.error(`❌ [GROK] Search error after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Extract citations from Grok response content and usage data
   */
  private extractCitations(content: string, usage?: any): string[] {
    // Try to extract URLs from content
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    
    // For debugging - log if we have usage data about sources
    if (usage && 'num_sources_used' in usage) {
      console.log(`🔍 [GROK] Sources used: ${usage.num_sources_used}`);
    }
    
    return Array.from(new Set(urls)); // Remove duplicates
  }

  /**
   * Search for social media context optimized for chat
   */
  async searchForChatContext(
    query: string,
    contextPrompt: string = "Provide a concise summary of the most recent and relevant social media discussions and information.",
    socialHandles?: string[]
  ): Promise<{ context: string; citations: string[] }> {
    const cacheKey = this.generateCacheKey(query, { 
      mode: 'on',
      sources: [{ type: 'x', included_x_handles: socialHandles }]
    });
    
    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Cache miss - perform actual search
    const result = await this.search(query, {
      socialHandles,
      systemPrompt: contextPrompt
    });

    const searchResult = {
      context: result.content,
      citations: result.citations
    };

    // Store result in cache
    this.setCachedResult(cacheKey, searchResult.context, searchResult.citations);

    return searchResult;
  }
}

// Export a singleton instance
export const grokService = new GrokService();

// Export types for use in other modules
export type { GrokSearchParameters };