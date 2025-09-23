import { useEffect, useRef, useCallback } from "react";
import { type Message, type User } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import SearchIndicator from "./search-indicator";
import SearchCitations from "./search-citations";
import AIActivityIndicator from "./ai-activity-indicator";
import { RotateCcw, Trash2, Copy } from "lucide-react";

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
  onRegenerateMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
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
  conversationId,
  onRegenerateMessage,
  onDeleteMessage
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const copyMessageContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      // You could add a toast notification here if needed
    }).catch((err) => {
      console.error('Failed to copy message content:', err);
    });
  }, []);

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
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Welcome to ContentCraft AI!
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              I'm here to help you brainstorm amazing social media content ideas. 
              Let's start by getting to know your brand and interests!
            </p>
            <div className="mt-4 text-xs text-muted-foreground/80 space-y-1">
              <p className="font-medium text-muted-foreground">💡 Try asking me to:</p>
              <p className="font-medium text-muted-foreground">• Analyze your Instagram profile (@username)</p>
              <p className="font-medium text-muted-foreground">• Research websites or blogs for inspiration</p>
              <p className="font-medium text-muted-foreground">• Check out competitor content strategies</p>
              <p className="font-medium text-muted-foreground">• Generate content ideas for your niche</p>
            </div>
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
            className={`group flex items-start space-x-3 ${shouldAnimate ? 'animate-fade-in' : ''} ${
              message.role === 'user' ? 'justify-end' : ''
            }`}
          >
          {message.role === 'assistant' && (
            <div className="hidden md:flex w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🤖</span>
            </div>
          )}
          
          <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
            

            <div className={`px-4 py-3 rounded-2xl ${
              message.role === 'user'
                ? 'bg-emerald-500 text-white rounded-tr-md max-w-fit'
                : 'bg-muted text-foreground dark:text-white rounded-tl-md'
            }`}>
              {message.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              ) : (
                <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 dark:prose-invert dark:text-white dark:prose-p:text-white dark:prose-headings:text-white dark:prose-strong:text-white dark:prose-em:text-white dark:prose-li:text-white dark:prose-a:text-blue-300">
                  {((message as any).metadata?.streaming) ? (
                    <span className="inline dark:text-white">
                      <ReactMarkdown
                        components={{
                          p: ({ children, ...props }) => <span {...props} className="dark:text-white">{children}</span>,
                          br: () => <br />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      <span className="w-2 h-4 bg-muted-foreground ml-1 animate-pulse inline-block align-baseline" />
                    </span>
                  ) : (
                    <ReactMarkdown 
                      components={{
                        p: ({ children, ...props }) => <p {...props} className="dark:text-white">{children}</p>,
                        span: ({ children, ...props }) => <span {...props} className="dark:text-white">{children}</span>,
                        strong: ({ children, ...props }) => <strong {...props} className="dark:text-white">{children}</strong>,
                        em: ({ children, ...props }) => <em {...props} className="dark:text-white">{children}</em>,
                        li: ({ children, ...props }) => <li {...props} className="dark:text-white">{children}</li>,
                        h1: ({ children, ...props }) => <h1 {...props} className="dark:text-white">{children}</h1>,
                        h2: ({ children, ...props }) => <h2 {...props} className="dark:text-white">{children}</h2>,
                        h3: ({ children, ...props }) => <h3 {...props} className="dark:text-white">{children}</h3>,
                        h4: ({ children, ...props }) => <h4 {...props} className="dark:text-white">{children}</h4>,
                        h5: ({ children, ...props }) => <h5 {...props} className="dark:text-white">{children}</h5>,
                        h6: ({ children, ...props }) => <h6 {...props} className="dark:text-white">{children}</h6>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
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
            
            {/* Timestamp and activity indicators */}
            {message.role === 'user' ? (
              /* User messages: timestamp below the message, right-aligned */
              <div className="text-xs text-muted-foreground mt-1 px-1">
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            ) : (
              /* Assistant messages: timestamp with activity indicators */
              <div className="text-xs text-muted-foreground mt-1 px-1 flex items-center gap-2">
                <span>
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                
                {/* Action buttons for assistant messages */}
                {!((message as any).metadata?.streaming) && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => copyMessageContent(message.content)}
                      className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-muted/50 transition-all duration-200"
                      title="Copy message"
                      data-testid={`button-copy-${message.id}`}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {onRegenerateMessage && (
                      <button
                        onClick={() => onRegenerateMessage(message.id.toString())}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-muted/50 transition-all duration-200"
                        title="Regenerate response"
                        data-testid={`button-regenerate-${message.id}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                    {onDeleteMessage && (
                      <button
                        onClick={() => onDeleteMessage(message.id.toString())}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-muted/50 transition-all duration-200"
                        title="Delete message"
                        data-testid={`button-delete-${message.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Show activity indicators for streaming assistant messages */}
                {(message as any).metadata?.streaming && (
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
            )}
          </div>

          {message.role === 'user' && (
            <div className="hidden md:flex w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full items-center justify-center flex-shrink-0">
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
