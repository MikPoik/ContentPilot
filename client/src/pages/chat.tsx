import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "../components/chat/sidebar";
import MessageList from "../components/chat/message-list";
import MessageInput from "../components/chat/message-input";
import { type Conversation, type Message, type UserProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Menu, X, Share, MoreVertical } from "lucide-react";

export default function Chat() {
  const { id: conversationId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Get conversations list
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Get messages for current conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  // Get user profile
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string = "New Conversation") => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      window.location.href = `/chat/${newConversation.id}`;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) {
        // Create new conversation first
        const newConversation = await createConversationMutation.mutateAsync("New Conversation");
        window.location.href = `/chat/${newConversation.id}`;
        return;
      }

      // Add user message immediately to optimistic state
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        role: 'user',
        content,
        metadata: null,
        createdAt: new Date(),
      };
      setOptimisticMessages(prev => [...prev, userMessage]);

      setIsStreaming(true);
      setStreamingMessage("");

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingMessage(accumulated);
      }

      setIsStreaming(false);
      setStreamingMessage("");
      
      // Clear optimistic messages and refetch to get real data
      setOptimisticMessages([]);
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      setIsStreaming(false);
      setStreamingMessage("");
      setOptimisticMessages([]); // Clear optimistic messages on error
    },
  });

  // Handle new conversation
  const handleNewConversation = () => {
    createConversationMutation.mutate("New Conversation");
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  // Get current conversation
  const currentConversation = conversations.find(c => c.id === conversationId);

  // Combine real messages with optimistic messages
  const allMessages = [...messages, ...optimisticMessages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Close sidebar on mobile when route changes and clear optimistic messages
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    // Clear optimistic messages when conversation changes
    setOptimisticMessages([]);
  }, [conversationId, isMobile]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-64 lg:flex-shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          conversations={conversations}
          currentConversationId={conversationId}
          userProfile={userProfile}
          onNewConversation={handleNewConversation}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce-subtle"></div>
              <h2 className="text-lg font-semibold text-gray-900">
                {currentConversation?.title || "ContentCraft AI"}
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-gray-700">
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-gray-700">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={allMessages}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            userProfile={userProfile}
            conversationId={conversationId}
          />
        </div>

        {/* Message input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
