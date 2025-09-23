import { type Conversation, type InsertConversation, type Message, type InsertMessage, type Memory, type InsertMemory, type User, type UpsertUser, type UpdateUserProfile, type UpdateUserSubscription, type SubscriptionPlan, type InsertSubscriptionPlan, type MessageMetadata, users, conversations, messages, memories, subscriptionPlans } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, profileData: Partial<UpdateUserProfile>): Promise<User | undefined>;
  
  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  
  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Memories
  getMemories(userId: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  upsertMemory(memory: InsertMemory, similarityThreshold?: number): Promise<Memory>;
  deleteMemory(id: string): Promise<boolean>;
  searchSimilarMemories(userId: string, embedding: number[], limit?: number): Promise<(Memory & { similarity: number })[]>;
  
  // Subscription operations
  updateUserSubscription(id: string, subscriptionData: Partial<UpdateUserSubscription>): Promise<User | undefined>;
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  incrementMessageUsage(userId: string): Promise<User | undefined>;
  resetMessageUsage(userId: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return result.rowCount! > 0;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    return results.map(msg => ({ ...msg, metadata: msg.metadata as MessageMetadata | null }));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message ? { ...message, metadata: message.metadata as MessageMetadata | null } : undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    
    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    return { ...message, metadata: message.metadata as MessageMetadata | null };
  }

  async updateUserProfile(id: string, profileData: Partial<UpdateUserProfile>): Promise<User | undefined> {
    // First get the current user data to merge array fields properly
    const currentUser = await this.getUser(id);
    if (!currentUser) {
      return undefined;
    }

    // Handle contentNiche merging - combine existing with new values, removing duplicates
    let mergedProfileData = { ...profileData };
    if (profileData.contentNiche && Array.isArray(profileData.contentNiche)) {
      const existingNiches = currentUser.contentNiche || [];
      const newNiches = profileData.contentNiche;
      
      // Merge arrays with proper normalization and deduplication
      const allNiches = [...existingNiches, ...newNiches];
      const normalized = new Map<string, string>();
      
      allNiches.forEach(niche => {
        if (niche && typeof niche === 'string') {
          const trimmed = niche.trim();
          if (trimmed) {
            const key = trimmed.toLowerCase();
            if (!normalized.has(key)) {
              normalized.set(key, trimmed);
            }
          }
        }
      });
      
      mergedProfileData.contentNiche = Array.from(normalized.values());
    }

    // Handle primaryPlatforms merging (new multi-platform support)
    if (profileData.primaryPlatforms && Array.isArray(profileData.primaryPlatforms)) {
      const existingPlatforms = (currentUser as any).primaryPlatforms || [];
      const newPlatforms = profileData.primaryPlatforms || [];

      const all = [...existingPlatforms, ...newPlatforms];
      const normalized = new Map<string, string>();
      all.forEach((p) => {
        if (typeof p === 'string') {
          const trimmed = p.trim();
          if (trimmed) {
            const key = trimmed.toLowerCase();
            if (!normalized.has(key)) normalized.set(key, trimmed);
          }
        }
      });
      mergedProfileData.primaryPlatforms = Array.from(normalized.values());

      // Keep legacy single primaryPlatform in sync when array provided
      if (!profileData.primaryPlatform && mergedProfileData.primaryPlatforms.length > 0) {
        mergedProfileData.primaryPlatform = mergedProfileData.primaryPlatforms[0];
      }
    }

    // Handle profileData merging - merge nested object fields instead of replacing
    if (profileData.profileData && typeof profileData.profileData === 'object' && profileData.profileData !== null) {
      const existingProfileData = currentUser.profileData as any || {};
      const newProfileData = profileData.profileData as any;
      
      // Merge the profileData objects, preserving existing fields
      const mergedNestedProfileData = { ...existingProfileData };
      
      Object.keys(newProfileData).forEach(key => {
        const newValue = newProfileData[key];
        
        // Handle array fields (like contentGoals) - merge arrays instead of replacing
        if (Array.isArray(newValue) && Array.isArray(mergedNestedProfileData[key])) {
          // Merge arrays and remove duplicates
          const combined = [...(mergedNestedProfileData[key] || []), ...newValue];
          const uniqueFiltered = combined.filter(item => item != null && item !== '');
          mergedNestedProfileData[key] = Array.from(new Set(uniqueFiltered));
        } else if (newValue !== null && newValue !== undefined && newValue !== '') {
          // For non-array fields, update only if new value is meaningful
          mergedNestedProfileData[key] = newValue;
        }
        // If newValue is null/undefined/empty, keep existing value (don't overwrite)
      });
      
      mergedProfileData.profileData = mergedNestedProfileData;
    }

    const [user] = await db
      .update(users)
      .set({ ...mergedProfileData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Memories
  async getMemories(userId: string): Promise<Memory[]> {
    return await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt));
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    const [memory] = await db.select().from(memories).where(eq(memories.id, id));
    return memory;
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const [memory] = await db
      .insert(memories)
      .values(insertMemory)
      .returning();
    return memory;
  }

  async upsertMemory(insertMemory: InsertMemory, similarityThreshold: number = 0.9): Promise<Memory> {
    // First, search for very similar existing memories
    if (!insertMemory.embedding) {
      throw new Error('Embedding is required for upsert operation');
    }
    
    const similarMemories = await this.searchSimilarMemories(
      insertMemory.userId, 
      insertMemory.embedding, 
      5
    );

    // Find the most similar memory above threshold
    const existingSimilar = similarMemories.find(m => m.similarity >= similarityThreshold);

    if (existingSimilar) {
      // Update the existing memory with new content and embedding
      console.log(`🔄 [MEMORY_UPSERT] Updating existing memory (similarity: ${existingSimilar.similarity.toFixed(3)})`);
      const [updatedMemory] = await db
        .update(memories)
        .set({
          content: insertMemory.content,
          embedding: insertMemory.embedding,
          metadata: insertMemory.metadata,
          createdAt: new Date() // Update timestamp to show it's been refreshed
        })
        .where(eq(memories.id, existingSimilar.id))
        .returning();
      return updatedMemory;
    } else {
      // No similar memory found, create new one
      console.log(`➕ [MEMORY_UPSERT] Creating new memory (no similar found above ${similarityThreshold})`);
      const [newMemory] = await db
        .insert(memories)
        .values(insertMemory)
        .returning();
      return newMemory;
    }
  }

  async deleteMemory(id: string): Promise<boolean> {
    const result = await db.delete(memories).where(eq(memories.id, id));
    return result.rowCount! > 0;
  }

  async searchSimilarMemories(userId: string, embedding: number[], limit: number = 10): Promise<(Memory & { similarity: number })[]> {
    const embeddingString = `[${embedding.join(',')}]`;
    
    const result = await db.execute(sql`
      SELECT 
        id,
        user_id,
        content,
        embedding,
        metadata,
        created_at,
        1 - (embedding <=> ${embeddingString}::vector) as similarity
      FROM memories 
      WHERE user_id = ${userId}
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT ${limit}
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      content: row.content,
      embedding: row.embedding,
      metadata: row.metadata,
      createdAt: row.created_at,
      similarity: parseFloat(row.similarity)
    }));
  }

  // Subscription operations
  async updateUserSubscription(id: string, subscriptionData: Partial<UpdateUserSubscription>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.priceAmount);
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [subscriptionPlan] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return subscriptionPlan;
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async incrementMessageUsage(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        messagesUsed: sql`${users.messagesUsed} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetMessageUsage(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        messagesUsed: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
