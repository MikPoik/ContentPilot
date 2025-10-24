/**
 * Memory Management Utilities
 * Helpers for memory decay, scoring, and lifecycle management
 */

import { type Memory } from "@shared/schema";

export interface EnhancedMemoryMetadata {
  source: 'conversation' | 'analysis' | 'user_confirmed' | 'search_result';
  importance: number; // 0.0 to 1.0
  lastRetrieved?: Date;
  retrievalCount: number;
  workflowPhase?: string;
  conversationId?: string;
  relatedMemories?: string[];
  createdAt: string;
  keywords?: string[];
}

/**
 * Calculate memory score with decay factor
 * More recent and frequently accessed memories score higher
 * 
 * @param memory - Memory object with metadata
 * @param decayHalfLife - Number of days for score to decay to 50% (default: 30)
 * @returns Score between 0.0 and 1.0
 */
export function calculateMemoryScore(
  memory: Memory & { similarity?: number },
  decayHalfLife: number = 30
): number {
  const metadata = memory.metadata as EnhancedMemoryMetadata | undefined;
  const importance = metadata?.importance || 0.5;
  const retrievalCount = metadata?.retrievalCount || 0;
  const similarity = memory.similarity || 0.8;

  // Time decay: exponential decay based on days since creation
  const daysSinceCreation = (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-daysSinceCreation * Math.LN2 / decayHalfLife); // Exponential decay

  // Retrieval boost: memories that are frequently accessed are more valuable
  const retrievalBoost = 1 + (0.1 * Math.min(retrievalCount, 10)); // Cap at 10 retrievals

  // Combined score
  const score = importance * decayFactor * retrievalBoost * similarity;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculate importance score for a new memory based on content
 */
export function calculateImportanceScore(
  memoryContent: string,
  context: {
    isFromAnalysis?: boolean;
    isUserStatement?: boolean;
    containsBusinessInfo?: boolean;
    workflowPhase?: string;
  }
): number {
  let score = 0.5; // Base score

  // Boost for analysis-derived memories
  if (context.isFromAnalysis) {
    score += 0.2;
  }

  // Boost for direct user statements
  if (context.isUserStatement) {
    score += 0.15;
  }

  // Boost for business-critical information
  if (context.containsBusinessInfo) {
    score += 0.15;
  }

  // Content-based scoring
  const content = memoryContent.toLowerCase();

  // Profile-related information
  if (content.includes('my name') || content.includes('my business') || 
      content.includes('i am') || content.includes("i'm")) {
    score += 0.2;
  }

  // Business information
  if (content.includes('target audience') || content.includes('brand voice') ||
      content.includes('content goal') || content.includes('niche')) {
    score += 0.15;
  }

  // Preferences and decisions
  if (content.includes('prefer') || content.includes('want to') ||
      content.includes('decided to') || content.includes('will focus on')) {
    score += 0.1;
  }

  // Cap at 1.0
  return Math.min(1.0, score);
}

/**
 * Identify memories that should be cleaned up
 * Returns memories that are old, low-importance, and rarely accessed
 */
export function identifyStaleMemories(
  memories: (Memory & { score?: number })[],
  options: {
    minDaysOld?: number;
    maxLowImportanceScore?: number;
    maxResults?: number;
  } = {}
): Memory[] {
  const minDaysOld = options.minDaysOld || 90;
  const maxLowImportanceScore = options.maxLowImportanceScore || 0.3;
  const maxResults = options.maxResults || 50;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minDaysOld);

  return memories
    .filter(memory => {
      const isOld = new Date(memory.createdAt) < cutoffDate;
      const isLowScore = (memory.score || 0) < maxLowImportanceScore;
      return isOld && isLowScore;
    })
    .slice(0, maxResults);
}

/**
 * Group related memories for potential summarization
 * Finds memories with similar content or from same conversation
 */
export function findRelatedMemories(
  targetMemory: Memory,
  allMemories: Memory[],
  similarityThreshold: number = 0.85
): Memory[] {
  const related: Memory[] = [];
  const targetMetadata = targetMemory.metadata as EnhancedMemoryMetadata | undefined;

  for (const memory of allMemories) {
    if (memory.id === targetMemory.id) continue;

    const memoryMetadata = memory.metadata as EnhancedMemoryMetadata | undefined;

    // Same conversation
    if (targetMetadata?.conversationId && 
        memoryMetadata?.conversationId === targetMetadata.conversationId) {
      related.push(memory);
      continue;
    }

    // Explicitly marked as related
    if (targetMetadata?.relatedMemories?.includes(memory.id)) {
      related.push(memory);
      continue;
    }

    // Same workflow phase and high semantic similarity would be checked via embedding search
    // This is left as a TODO for vector similarity-based grouping
  }

  return related;
}

/**
 * Extract keywords from memory content for better searchability
 */
export function extractKeywords(content: string): string[] {
  // Simple keyword extraction - can be enhanced with NLP libraries
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 4 && // Skip short words
      !commonStopWords.has(word)
    );

  // Get unique words
  const unique = [...new Set(words)];

  // Sort by frequency (simple approach)
  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  return unique
    .sort((a, b) => (frequency.get(b) || 0) - (frequency.get(a) || 0))
    .slice(0, 10); // Top 10 keywords
}

const commonStopWords = new Set([
  'that', 'this', 'with', 'have', 'been', 'they', 'your', 'from', 
  'about', 'would', 'there', 'their', 'what', 'which', 'when',
  'where', 'will', 'can', 'all', 'were', 'we', 'but', 'or',
  'some', 'had', 'has', 'was', 'for', 'not', 'are', 'and',
  'the', 'to', 'of', 'in', 'is', 'it', 'you', 'he', 'she'
]);

/**
 * Update memory metadata after retrieval
 */
export function updateMemoryAfterRetrieval(
  metadata: EnhancedMemoryMetadata
): EnhancedMemoryMetadata {
  return {
    ...metadata,
    lastRetrieved: new Date(),
    retrievalCount: (metadata.retrievalCount || 0) + 1
  };
}

/**
 * Create enhanced metadata for a new memory
 */
export function createMemoryMetadata(
  source: EnhancedMemoryMetadata['source'],
  options: {
    importance?: number;
    workflowPhase?: string;
    conversationId?: string;
    isFromAnalysis?: boolean;
    isUserStatement?: boolean;
    containsBusinessInfo?: boolean;
  } = {}
): EnhancedMemoryMetadata {
  const importance = options.importance || calculateImportanceScore('', {
    isFromAnalysis: options.isFromAnalysis,
    isUserStatement: options.isUserStatement,
    containsBusinessInfo: options.containsBusinessInfo,
    workflowPhase: options.workflowPhase
  });

  return {
    source,
    importance,
    retrievalCount: 0,
    workflowPhase: options.workflowPhase,
    conversationId: options.conversationId,
    createdAt: new Date().toISOString()
  };
}
