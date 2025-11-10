import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, vector, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Profile fields for conversation-driven learning
  contentNiche: text("content_niche").array(), // Array of content focus areas
  primaryPlatform: varchar("primary_platform"), // Main social media platform (legacy, kept for backward compatibility)
  primaryPlatforms: text("primary_platforms").array(), // Multiple primary platforms support
  profileData: jsonb("profile_data"), // Flexible storage for learned info
  profileCompleteness: varchar("profile_completeness").default("0"), // Percentage as string
  // Stripe subscription fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlanId: varchar("subscription_plan_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  messagesUsed: integer("messages_used").default(0),
  messagesLimit: integer("messages_limit").default(20),
  messagePacks: integer("message_packs").default(0), // Total purchased message pack credits
  subscriptionStartedAt: timestamp("subscription_started_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional data like streaming status, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memories = pgTable("memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small dimensions
  metadata: jsonb("metadata"), // For storing additional context about the memory
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  stripePriceId: varchar("stripe_price_id").notNull(),
  messagesLimit: integer("messages_limit").notNull(),
  priceAmount: integer("price_amount").notNull(), // in cents
  priceCurrency: varchar("price_currency").default("usd"),
  isActive: boolean("is_active").default(true),
  planType: varchar("plan_type").default("subscription"), // 'subscription' or 'message_pack'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  contentNiche: true,
  primaryPlatform: true,
  primaryPlatforms: true,
  profileData: true,
  profileCompleteness: true,
}).partial().extend({
  // Optional flag to indicate arrays provided should REPLACE existing arrays
  replaceArrays: z.boolean().optional(),
});

export const insertMemorySchema = createInsertSchema(memories).pick({
  userId: true,
  content: true,
  embedding: true,
  metadata: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const updateUserSubscriptionSchema = createInsertSchema(users).pick({
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionPlanId: true,
  subscriptionStatus: true,
  messagesUsed: true,
  messagesLimit: true,
  messagePacks: true,
  subscriptionStartedAt: true,
}).partial();

// Instagram profile data interfaces
export interface InstagramProfile {
  username: string;
  full_name: string;
  biography: string;
  category: string;
  followers: number;
  following: number;
  posts: number;
  top_hashtags: string[];
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  similar_accounts: InstagramAccount[];
  post_texts: string[];
  profile_pic_url?: string;
  is_verified?: boolean;
  cached_at: string;
}

export interface InstagramAccount {
  username: string;
  full_name: string;
  category: string;
  followers: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  top_hashtags: string[];
  post_texts: string[];
}

export interface InstagramPost {
  pk: string;
  caption_text?: string;
  like_count: number;
  comment_count: number;
  media_type: number;
  taken_at: number;
}

// Hashtag search result interfaces
export interface InstagramHashtagPost {
  id: string;
  code: string;
  caption?: string;
  like_count: number;
  comment_count: number;
  media_type: number;
  taken_at: number;
  thumbnail_url?: string;
  username: string;
  user_id?: string;
}

export interface InstagramHashtagResult {
  hashtag: string;
  total_posts: number;
  posts: InstagramHashtagPost[];
  cached_at: string;
}

// Search metadata interface for messages
export interface SearchMessageMetadata {
  citations?: string[];
  searchQuery?: string;
  source?: 'web_search';
}

// General message metadata interface
export interface MessageMetadata extends Record<string, any> {
  citations?: string[];
  searchQuery?: string;
  source?: string;
  instagramProfile?: InstagramProfile;
  instagramHashtagResult?: InstagramHashtagResult;
}

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect & {
  metadata?: MessageMetadata | null;
};
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UpdateUserSubscription = z.infer<typeof updateUserSubscriptionSchema>;
