import type { Express } from "express";
import { storage } from "../storage";
import { insertConversationSchema } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import logger from "../logger";

export function registerConversationRoutes(app: Express) {
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
      logger.error("Conversation creation error:", error);
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
}