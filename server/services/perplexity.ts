interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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

interface CacheEntry {
  context: string;
  citations: string[];
  timestamp: number;
  lastAccessed: number;
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
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 200; // LRU cache capacity limit

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
   * Generate cache key for a query, recency filter, domains, and context prompt
   */
  private generateCacheKey(
    query: string,
    recency?: string,
    domains?: string[],
    contextPrompt?: string
  ): string {
    const normQuery = query.trim().toLowerCase().replace(/:/g, '_');
    const normalizedRecency = recency || 'week';
    const domainsPart = domains?.length ? domains.slice().sort().join(',').replace(/:/g, '_') : '*';
    const contextHash = contextPrompt ? this.simpleHash(contextPrompt) : 'default';

    return `${normQuery}|${normalizedRecency}|${domainsPart}|${contextHash}`;
  }

  /**
   * Simple hash function for context prompt to keep cache keys manageable
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is still valid (not expired)
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL_MS;
  }

  /**
   * Clean up expired cache entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Convert Map.entries() to array for iteration compatibility
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp >= this.CACHE_TTL_MS) {
        keysToDelete.push(key);
      }
    });

    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🧹 [PERPLEXITY CACHE] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cached result if available and valid
   */
  private getCachedResult(cacheKey: string): { context: string; citations: string[] } | null {
    this.cleanupExpiredEntries(); // Clean up expired entries first

    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
      // Update last accessed time for LRU
      cachedEntry.lastAccessed = Date.now();
      console.log(`📦 [PERPLEXITY CACHE] Cache HIT for key: ${cacheKey}`);
      return {
        context: cachedEntry.context,
        citations: cachedEntry.citations
      };
    }

    if (cachedEntry) {
      // Entry exists but is expired, remove it
      this.cache.delete(cacheKey);
      console.log(`⏰ [PERPLEXITY CACHE] Expired entry removed for key: ${cacheKey}`);
    }

    console.log(`❌ [PERPLEXITY CACHE] Cache MISS for key: ${cacheKey}`);
    return null;
  }

  /**
   * Store result in cache with LRU capacity management
   */
  private setCachedResult(cacheKey: string, context: string, citations: string[]): void {
    const now = Date.now();

    // Enforce LRU capacity limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(cacheKey, {
      context,
      citations,
      timestamp: now,
      lastAccessed: now
    });
    console.log(`💾 [PERPLEXITY CACHE] Cached result for key: ${cacheKey} (cache size: ${this.cache.size})`);
  }

  /**
   * Evict least recently used cache entries when capacity is exceeded
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    // Find the least recently used entry
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [PERPLEXITY CACHE] Evicted LRU entry: ${oldestKey} (cache size: ${this.cache.size})`);
    }
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
      model?: 'sonar';
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
        model: options?.model || 'sonar',
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
    // Generate cache key including all parameters to ensure correctness
    const effectiveRecency = recency || 'week';
    const cacheKey = this.generateCacheKey(query, effectiveRecency, domains, contextPrompt);

    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Cache miss - perform actual search
    // Derive a simple, language-agnostic hint: prefer keywords that match the
    // user's locale/script if the query contains non-ASCII/local characters.
    // Note: do NOT use hardcoded language keyword lists — keep the logic general.
    const containsNonAscii = /[^\x00-\x7F]/.test(query || '');
    const languageInstruction = containsNonAscii
      ? 'When composing search keywords, prefer terms that match the user\'s local script or language when the query appears to use non-ASCII/local characters. or site domain'
      : 'When composing search keywords, prefer terms that match the user\'s language/locale or site domain';

    const augmentedContextPrompt = `${contextPrompt}\n\nSearch guidance: ${languageInstruction} If the initial site-scoped search returns no results, normalize the query to the site domain only and retry.`;

    let result = await this.search(query, {
      systemPrompt: augmentedContextPrompt,
      temperature: 0.1,
      searchRecencyFilter: effectiveRecency,
      searchDomainFilter: domains?.length ? domains : undefined
    });

    // If no citations found and query is a site search, try an immediate domain-only normalization first
    if (result.citations.length === 0 && query.includes('site:')) {
      console.log(`🔍 [PERPLEXITY] No results for site search, attempting domain-only normalization as first fallback...`);

      // Extract domain from site: query
      const siteMatch = query.match(/site:([^\s]+)/);
      if (siteMatch) {
        const domain = siteMatch[1];

        // Immediate fallback: search using only the domain (normalize the query to the domain)
        try {
          const domainOnlyResult = await this.search(domain, {
            systemPrompt: augmentedContextPrompt,
            temperature: 0.1,
            // Use the domain as the domain filter to keep results scoped
            searchRecencyFilter: 'year',
            searchDomainFilter: [domain]
          });

          if (domainOnlyResult.citations.length > 0) {
            result = domainOnlyResult;
            console.log(`✅ [PERPLEXITY] Domain-only fallback successful: ${domainOnlyResult.citations.length} citations found`);
          }
        } catch (error) {
          console.error(`❌ [PERPLEXITY] Domain-only fallback failed:`, error);
        }

        // If still no results, continue with enhanced fallback strategies (recency adjustments, no-recency)
        if (result.citations.length === 0) {
          console.log(`🔍 [PERPLEXITY] Domain-only normalization did not return results, trying enhanced fallback strategies...`);

          // Strategy 1: Try with longer recency
          if (effectiveRecency === 'week') {
            console.log(`🔍 [PERPLEXITY] Strategy 1: Trying with month recency...`);
            try {
              const monthResult = await this.search(query, {
                systemPrompt: augmentedContextPrompt,
                temperature: 0.1,
                searchRecencyFilter: 'month',
                searchDomainFilter: domains?.length ? domains : undefined
              });

              if (monthResult.citations.length > 0) {
                result = monthResult;
                console.log(`✅ [PERPLEXITY] Strategy 1 successful: ${monthResult.citations.length} citations found`);
              }
            } catch (error) {
              console.error(`❌ [PERPLEXITY] Strategy 1 failed:`, error);
            }
          }

          // Strategy 2: Try with year recency if still no results
          if (result.citations.length === 0) {
            console.log(`🔍 [PERPLEXITY] Strategy 2: Trying with year recency...`);
            try {
              const yearResult = await this.search(query, {
                systemPrompt: augmentedContextPrompt,
                temperature: 0.1,
                searchRecencyFilter: 'year',
                searchDomainFilter: domains?.length ? domains : undefined
              });

              if (yearResult.citations.length > 0) {
                result = yearResult;
                console.log(`✅ [PERPLEXITY] Strategy 2 successful: ${yearResult.citations.length} citations found`);
              }
            } catch (error) {
              console.error(`❌ [PERPLEXITY] Strategy 2 failed:`, error);
            }
          }

          // Strategy 3: Try without recency filter for maximum coverage
          if (result.citations.length === 0) {
            console.log(`🔍 [PERPLEXITY] Strategy 3: Trying without recency filter...`);
            try {
              const noRecencyResult = await this.search(query, {
                systemPrompt: augmentedContextPrompt,
                temperature: 0.1,
                // No recency filter
                searchDomainFilter: domains?.length ? domains : undefined
              });

              if (noRecencyResult.citations.length > 0) {
                result = noRecencyResult;
                console.log(`✅ [PERPLEXITY] Strategy 3 successful: ${noRecencyResult.citations.length} citations found`);
              }
            } catch (error) {
              console.error(`❌ [PERPLEXITY] Strategy 3 failed:`, error);
            }
          }
        }
      }
    }

    const searchResult = {
      context: result.content,
      citations: result.citations
    };

    // Store result in cache for future use
    this.setCachedResult(cacheKey, searchResult.context, searchResult.citations);

    return searchResult;
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