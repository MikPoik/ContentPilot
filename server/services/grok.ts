import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { WebSearchResult } from "./perplexity";

interface GrokSearchParameters {
  mode: 'on' | 'off' | 'auto';
  sources?: Array<{
    type: 'x';
    includedXHandles?: string[];
    excludedXHandles?: string[];
    postFavoriteCount?: number;
    postViewCount?: number;
  }>;
  maxSearchResults?: number;
  returnCitations?: boolean;
  [key: string]: any; // Allow additional properties for JSONValue compatibility
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
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (shorter for real-time data)
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    if (!process.env.XAI_API_KEY) {
      console.warn('⚠️ [GROK] XAI_API_KEY not set. Grok search functionality will be disabled.');
    }
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
          includedXHandles: options?.socialHandles && options.socialHandles.length > 0 ? options.socialHandles : undefined,
          excludedXHandles: options?.excludeHandles && options.excludeHandles.length > 0 ? options.excludeHandles : undefined,
          postFavoriteCount: options?.minFavorites || 10,
          postViewCount: options?.minViews || 100,
        }],
        maxSearchResults: 10,
        returnCitations: true
      };

      const fullPrompt = options?.systemPrompt 
        ? `${options.systemPrompt}\n\n${query}`
        : query;

      const result = await generateText({
        model: xai('grok-3-latest'),
        prompt: fullPrompt,
        providerOptions: {
          xai: {
            searchParameters: searchParams
          }
        }
      });

      const content = result.text || '';
      console.log(`🔍 [GROK] Search completed: ${Date.now() - startTime}ms`);

      // Extract citations from sources and content
      const citations = this.extractCitations(content, result.sources);

      // Log response details for debugging
      console.log(`🔍 [GROK] Response content length: ${content.length}, citations found: ${citations.length}`);
      if (result.sources && result.sources.length > 0) {
        console.log(`🔍 [GROK] API returned ${result.sources.length} sources`);
      }

      return {
        content,
        citations,
        usage: undefined // Usage information not available from AI SDK
      };

    } catch (error) {
      console.error(`❌ [GROK] Search error after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Extract citations from Grok response content and sources
   */
  private extractCitations(content: string, sources?: any[]): string[] {
    const citations: string[] = [];
    
    // Extract URLs from sources if available
    if (sources && Array.isArray(sources)) {
      sources.forEach(source => {
        if (source.url) {
          citations.push(source.url);
        }
      });
    }
    
    // Also extract URLs from content as fallback
    const urlRegex = /https?:\/\/[^\s]+/g;
    const contentUrls = content.match(urlRegex) || [];
    citations.push(...contentUrls);
    
    return Array.from(new Set(citations)); // Remove duplicates
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
      sources: [{ type: 'x', includedXHandles: socialHandles }]
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