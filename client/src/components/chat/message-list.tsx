import { useEffect, useRef, useCallback } from "react";
import { type Message, type User } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import SearchIndicator from "./search-indicator";
import SearchCitations from "./search-citations";
import AIActivityIndicator from "./ai-activity-indicator";

interface MessageListProps {
  messages: Message[];
  streamingMessage: string;
  isStreaming: boolean;
  isSearching?: boolean;
  searchQuery?: string;
  searchCitations?: string[];
  aiActivity?: 'thinking' | 'reasoning' | 'searching' | 'recalling' | 'analyzing' | 'generating' | null;
  aiActivityMessage?: string;
  user?: User;
  conversationId?: string;
}

export default function MessageList({ 
  messages, 
  streamingMessage, 
  isStreaming, 
  isSearching = false,
  searchQuery,
  searchCitations = [],
  aiActivity = null,
  aiActivityMessage = '',
  user,
  conversationId 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Scroll when new complete messages are added (but not when streaming message is added to state)
  const previousMessageCountRef = useRef(messages.length);
  useEffect(() => {
    // Only scroll if messages increased and we're not currently streaming
    if (messages.length > previousMessageCountRef.current && !isStreaming) {
      scrollToBottom();
    }
    previousMessageCountRef.current = messages.length;
  }, [messages.length, isStreaming, scrollToBottom]);

  // Scroll once when streaming starts, then continue scrolling during streaming
  const streamingStartedRef = useRef(false);
  useEffect(() => {
    if (isStreaming && !streamingStartedRef.current) {
      streamingStartedRef.current = true;
      scrollToBottom();
    } else if (!isStreaming) {
      streamingStartedRef.current = false;
    }
  }, [isStreaming, scrollToBottom]);

  // Continuously scroll during streaming as content updates
  useEffect(() => {
    if (isStreaming && streamingMessage) {
      scrollToBottom();
    }
  }, [isStreaming, streamingMessage, scrollToBottom]);

  // Show welcome message only for completely empty state
  if (!conversationId && messages.length === 0 && !streamingMessage && !isStreaming) {
    return (
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto px-4 py-6 space-y-6"
        data-testid="message-list"
      >
        {/* Welcome Message */}
        <div className="flex justify-center">
          <div className="max-w-md text-center animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <span className="text-white text-xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to ContentCraft AI!
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              I'm here to help you brainstorm amazing social media content ideas. 
              Let's start by getting to know your brand and interests!
            </p>
          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-6 space-y-6"
      data-testid="message-list"
    >
      {/* Render all messages; streaming assistant updates in-place via metadata.streaming */}
      {messages.map((message) => {
        // Only apply fade-in to user messages and assistant messages from real DB (not optimistic)
        // Optimistic assistant messages have timestamp IDs, real DB messages have UUIDs
        const hasClientKey = Boolean((message as any).metadata?.clientKey);
        const isOptimisticAssistant = message.role === 'assistant' && ((/^\d+-assistant$/.test(message.id.toString())) || /^temp-stream-/.test(message.id.toString()) || hasClientKey);
        const shouldAnimate = message.role === 'user' || !isOptimisticAssistant;
        
        return (
          <div 
            key={(message as any).metadata?.clientKey || message.id}
            className={`flex items-start space-x-3 ${shouldAnimate ? 'animate-fade-in' : ''} ${
              message.role === 'user' ? 'justify-end' : ''
            }`}
          >
          {message.role === 'assistant' && (
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🤖</span>
            </div>
          )}
          
          <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'flex justify-end' : ''}`}>
            

            <div className={`px-4 py-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-emerald-500 text-white rounded-tr-md ml-auto max-w-fit'
                : 'bg-gray-100 text-gray-900 rounded-tl-md'
            }`}>
              {message.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                  {((message as any).metadata?.streaming) ? (
                    <span className="inline">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <span>{children}</span>,
                          br: () => <br />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      <span className="w-2 h-4 bg-gray-400 ml-1 animate-pulse inline-block align-baseline" />
                    </span>
                  ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                </div>
              )}
            </div>
            
            {/* Show citations for assistant messages if available */}
            {message.role === 'assistant' && message.metadata?.citations && (
              <SearchCitations 
                citations={message.metadata.citations as string[]} 
                searchQuery={message.metadata.searchQuery as string}
              />
            )}
            <div className={`text-xs text-gray-500 mt-1 px-1 flex items-center gap-2 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              <span>
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {/* Show activity indicators for streaming assistant messages */}
              {message.role === 'assistant' && (message as any).metadata?.streaming && (
                <>
                  <AIActivityIndicator 
                    activity={(message as any).metadata?.aiActivity || null}
                    message={(message as any).metadata?.aiActivityMessage || ''}
                    searchQuery={(message as any).metadata?.searchQuery}
                  />
                  {!((message as any).metadata?.aiActivity) && isSearching && (
                    <SearchIndicator isSearching={true} searchQuery={(message as any).metadata?.searchQuery} />
                  )}
                </>
              )}
            </div>
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
          )}
        </div>
        );
      })}

      {/* No separate streaming block; content streams in-place within the assistant message */}

      <div ref={messagesEndRef} />
    </div>
  );
}
