import { useState, useEffect, startTransition, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "../components/chat/sidebar";
import MessageList from "../components/chat/message-list";
import MessageInput from "../components/chat/message-input";
import ExportMenu from "../components/chat/export-menu";
import { type Conversation, type Message, type User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Share, MoreVertical, LogOut, TestTube, Download } from "lucide-react";
import MemoryTester from "../components/MemoryTester";
import SearchIndicator from "../components/chat/search-indicator";
import AIActivityIndicator from "../components/chat/ai-activity-indicator";

export default function Chat() {
  const { id: conversationId } = useParams();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Memoize handlers to prevent dropdown re-renders
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false); // This state is used for the indicator
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [searchCitations, setSearchCitations] = useState<string[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [showMemoryTester, setShowMemoryTester] = useState(false);
  const [aiActivity, setAiActivity] = useState<'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | null>(null);
  const [aiActivityMessage, setAiActivityMessage] = useState<string>('');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth() as { user: User | undefined };
  const { toast } = useToast();

  // State for the typing indicator and the search query extracted from streaming data
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState<any>(null); // To store search metadata
  const [isLoading, setIsLoading] = useState(false); // General loading state for sending messages
  const [messages, setMessages] = useState<Message[]>([]); // Local state for messages to enable real-time updates

  // Get conversations list
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Get messages for current conversation
  const { data: messagesFromApi = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
    staleTime: 0, // Always consider messages stale to ensure fresh data when switching conversations
  });

  // Effect to sync API messages with local state when conversation changes
  useEffect(() => {
    if (messagesFromApi) {
      setMessages(messagesFromApi);
    }
  }, [messagesFromApi]);

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string = "New Conversation") => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  // Streaming function outside mutation context
  const streamResponse = async (targetConversationId: string, content: string) => {
    console.log('🚀 Starting stream response');
    setIsStreaming(true);
    setIsSearching(false); // Reset search indicator state
    setStreamingMessage("");
    setSearchCitations([]);
    setSearchQuery(content); // Set the initial user query
    setAiActivity('thinking');
    setAiActivityMessage('Processing your request...');

    const response = await fetch(`/api/conversations/${targetConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Message limit reached. Please upgrade your subscription.");
      }
      throw new Error("Failed to send message");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let accumulated = "";
    let actualContentStarted = false;
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;

        let chunkContent = chunk;

        // Check for various AI activity indicators in the stream
        const searchMetaRegex = /\[SEARCH_META\][\s\S]*?\[\/SEARCH_META\]/g;
        const activityRegex = /\[AI_ACTIVITY\](.*?)\[\/AI_ACTIVITY\]/g;
        
        // Handle search metadata
        const searchMatches = chunkContent.match(searchMetaRegex);
        if (searchMatches) {
          searchMatches.forEach(match => {
            try {
              const metaContent = match.match(/\[SEARCH_META\]([\s\S]*?)\[\/SEARCH_META\]/);
              if (metaContent) {
                const searchMeta = JSON.parse(metaContent[1]);
                console.log('🔍 [CLIENT] Received search metadata:', searchMeta);
                setStreamingResponse(searchMeta); // Store metadata for UI checks

                // Set search indicator based on AI decision to search
                if (searchMeta.searchQuery && searchMeta.searchQuery.trim()) {
                  setIsSearching(true); // Activate search indicator
                  setAiActivity('searching');
                  setSearchQuery(searchMeta.searchQuery); // Update search query display
                  setSearchCitations(searchMeta.citations || []); // Update citations
                  console.log(`🔍 Search indicator activated for query: ${searchMeta.searchQuery}`);
                } else {
                  setIsSearching(false); // Deactivate if no search query in metadata
                }
              }
            } catch (e) {
              console.error('Failed to parse search metadata:', e);
              setIsSearching(false); // Ensure indicator is off on parsing error
            }
          });
          chunkContent = chunkContent.replace(searchMetaRegex, '');
        }

        // Handle activity indicators
        const activityMatches = chunkContent.match(activityRegex);
        if (activityMatches) {
          activityMatches.forEach(match => {
            try {
              const activityContent = match.match(/\[AI_ACTIVITY\](.*?)\[\/AI_ACTIVITY\]/);
              if (activityContent) {
                const activityData = JSON.parse(activityContent[1]);
                setAiActivity(activityData.type);
                setAiActivityMessage(activityData.message || '');
                console.log(`🤖 [CLIENT] AI Activity: ${activityData.type} - ${activityData.message}`);
              }
            } catch (e) {
              console.error('Failed to parse activity metadata:', e);
            }
          });
          chunkContent = chunkContent.replace(activityRegex, '');
        }

        // Add clean content to accumulated display
        accumulated += chunkContent;

        // Once we get actual content, switch to generating activity
        if (!actualContentStarted && accumulated.trim()) {
          actualContentStarted = true;
          setAiActivity('generating');
          setAiActivityMessage('Generating response...');
          // The search indicator should *remain* visible if a search was initiated,
          // even if content starts appearing. It only hides when the stream is done
          // or if explicitly turned off by new metadata.
        }

        // Force immediate React update using flushSync for real-time streaming
        flushSync(() => {
          setStreamingMessage(accumulated);
        });
      }

      console.log(`✅ Stream complete: ${chunkCount} chunks, ${accumulated.length} chars`);
    } catch (error) {
      console.error('❌ Stream error:', error);
      setIsSearching(false); // Ensure indicator is off on error
      throw error;
    } finally {
      // Final state updates after stream completion
      startTransition(() => {
        const assistantMessage: Message = {
          id: `${Date.now()}-assistant`, // Temporary ID, will be replaced by actual API ID if available
          conversationId: targetConversationId,
          role: 'assistant',
          content: accumulated,
          metadata: searchCitations.length > 0 ? { citations: searchCitations } : null,
          createdAt: new Date(),
        };

        console.log('💾 Adding final message to optimistic state');
        // Use the local 'messages' state here to add the new message
        setMessages(current => [...current, assistantMessage]);
        setIsStreaming(false);
        setAiActivity(null);
        setAiActivityMessage('');
        // Keep setIsSearching true if a search was performed, it will be reset by the next message or cleared on conversation change
        setStreamingMessage("");
        setStreamingResponse(null); // Clear search metadata after processing
      });
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      let targetConversationId = conversationId;

      if (!conversationId) {
        // Create new conversation first
        const newConversation = await createConversationMutation.mutateAsync("New Conversation");
        targetConversationId = newConversation.id;
        setLocation(`/chat/${newConversation.id}`);
      }

      // Add user message immediately to optimistic state (local 'messages' state)
      const userMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID
        conversationId: targetConversationId!,
        role: 'user',
        content,
        metadata: null,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Stream response
      await streamResponse(targetConversationId!, content);
    },
    onError: (error) => {
      console.error('Send message error:', error);
      setIsStreaming(false);
      setIsSearching(false); // Ensure search indicator is off on error
      setAiActivity(null);
      setAiActivityMessage('');
      setStreamingMessage("");
      setSearchCitations([]);
      setOptimisticMessages([]); // Clear optimistic messages on error
      setStreamingResponse(null); // Clear search metadata on error

      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      // Show specific error message if available
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // This is called after onSuccess or onError
      // Reset streaming states that are not handled by streamResponse's finally block
      setIsStreaming(false);
      setIsSearching(false); // Ensure search indicator is off when mutation settles
      setAiActivity(null);
      setAiActivityMessage('');
      setStreamingMessage("");
      setStreamingResponse(null); // Clear search metadata
    }
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

  // Combine real messages with optimistic messages (now handled by the local 'messages' state)
  const allMessages = messages; // Use the local 'messages' state

  // Close sidebar on mobile when route changes and clear states
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    // Clear states related to ongoing streams or searches when conversation changes
    setOptimisticMessages([]); // This might be redundant now if using local messages state
    setStreamingMessage("");
    setIsStreaming(false);
    setIsSearching(false); // Crucially, reset search indicator state
    setAiActivity(null);
    setAiActivityMessage('');
    setSearchCitations([]);
    setSearchQuery(undefined);
    setStreamingResponse(null); // Clear search metadata
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
          user={user}
          onNewConversation={handleNewConversation}
          onClose={handleSidebarClose}
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
        <header className="flex items-center bg-white border-b border-gray-200 px-2 py-2 shadow-sm">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden pr-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
              onClick={handleSidebarToggle}
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="w-1 h-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate min-w-0">
              {currentConversation?.title || "ContentCraft AI"}
            </h2>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-1 flex-none shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 ${showMemoryTester ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setShowMemoryTester(!showMemoryTester)}
              data-testid="button-memory-tester"
            >
              <TestTube className="h-4 w-4" />
            </Button>
            <ExportMenu 
              messages={allMessages}
              conversation={currentConversation}
              disabled={!conversationId || allMessages.length === 0}
            />
            <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-gray-700">
              <Share className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 text-gray-500 hover:text-gray-700"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Dropdown Menu */}
          <div className="md:hidden flex-none shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 text-gray-500 hover:text-gray-700">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowMemoryTester(!showMemoryTester)}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Memory Tester
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!conversationId || allMessages.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Chat
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { window.location.href = "/api/logout"; }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages or Memory Tester */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {showMemoryTester ? (
            <MemoryTester />
          ) : (
            <MessageList
              messages={allMessages}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
              isSearching={isSearching}
              searchQuery={searchQuery}
              searchCitations={searchCitations}
              aiActivity={aiActivity}
              aiActivityMessage={aiActivityMessage}
              user={user}
              conversationId={conversationId}
            />
          )}
        </div>

        {/* Message input - only show when not in memory tester mode */}
        {!showMemoryTester && (
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending || isStreaming} // Also consider isStreaming as loading
            disabled={isStreaming}
          />
        )}
      </div>
    </div>
  );
}