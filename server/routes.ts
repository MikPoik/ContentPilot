import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, updateUserProfileSchema } from "@shared/schema";
import { generateChatResponse, generateConversationTitle, extractProfileInfo } from "./services/openai";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all conversations for authenticated user
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get a specific conversation
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      // Verify ownership
      const userId = req.user.claims.sub;
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversation" });
    }
  });

  // Create a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse({ ...req.body, userId });
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error("Conversation creation error:", error);
      res.status(400).json({ message: "Invalid conversation data" });
    }
  });

  // Delete a conversation
  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Verify ownership first
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const userId = req.user.claims.sub;
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ message: "Conversation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify conversation exists and user owns it
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send a message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conversationId = req.params.id;
      const userId = req.user.claims.sub;
      
      // Verify conversation exists and user owns it
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Save user message
      await storage.createMessage({
        conversationId,
        role: 'user',
        content,
      });

      // Get conversation history and user profile
      const messages = await storage.getMessages(conversationId);
      const user = await storage.getUser(userId);
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // Set up streaming response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Generate AI response stream with user profile
      const responseStream = await generateChatResponse(chatHistory, user);
      let fullResponse = '';

      const reader = responseStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          fullResponse += value;
          res.write(value);
        }
        
        // Save AI response
        await storage.createMessage({
          conversationId,
          role: 'assistant',
          content: fullResponse,
        });

        // Extract and update user profile from conversation
        try {
          const profileUpdates = await extractProfileInfo(content, fullResponse, user!);
          if (profileUpdates && Object.keys(profileUpdates).length > 0) {
            await storage.updateUserProfile(userId, profileUpdates);
          }
        } catch (error) {
          console.log('Profile extraction error:', error);
        }

        // Update conversation title if it's the first exchange
        if (messages.length <= 2 && conversation.title === 'New Conversation') {
          const newTitle = await generateConversationTitle([
            ...chatHistory,
            { role: 'assistant', content: fullResponse }
          ]);
          await storage.updateConversation(conversationId, { title: newTitle });
        }

        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        res.end();
      }
    } catch (error) {
      console.error('Message error:', error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
