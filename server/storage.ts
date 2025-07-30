import { type Conversation, type InsertConversation, type Message, type InsertMessage, type UserProfile, type InsertUserProfile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Conversations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  
  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // User Profile
  getUserProfile(): Promise<UserProfile | undefined>;
  createOrUpdateUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private userProfile: UserProfile | undefined;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.userProfile = undefined;
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updated = { ...conversation, ...updates, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    // Delete all messages in the conversation
    const conversationMessages = Array.from(this.messages.values()).filter(
      m => m.conversationId === id
    );
    conversationMessages.forEach(m => this.messages.delete(m.id));
    
    return this.conversations.delete(id);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage,
      metadata: insertMessage.metadata || null,
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    
    // Update conversation's updatedAt
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      await this.updateConversation(conversation.id, { updatedAt: new Date() });
    }
    
    return message;
  }

  async getUserProfile(): Promise<UserProfile | undefined> {
    return this.userProfile;
  }

  async createOrUpdateUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const now = new Date();
    if (this.userProfile) {
      this.userProfile = {
        ...this.userProfile,
        ...insertProfile,
        updatedAt: now
      };
    } else {
      const id = randomUUID();
      this.userProfile = {
        name: insertProfile.name || "User",
        initials: insertProfile.initials || "U",
        niche: insertProfile.niche || null,
        platforms: insertProfile.platforms || null,
        interests: insertProfile.interests || null,
        id,
        createdAt: now,
        updatedAt: now
      };
    }
    return this.userProfile;
  }
}

export const storage = new MemStorage();
