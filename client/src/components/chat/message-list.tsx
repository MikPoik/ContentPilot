import { useEffect, useRef } from "react";
import { type Message, type User } from "@shared/schema";

interface MessageListProps {
  messages: Message[];
  streamingMessage: string;
  isStreaming: boolean;
  user?: User;
  conversationId?: string;
}

export default function MessageList({ 
  messages, 
  streamingMessage, 
  isStreaming, 
  user,
  conversationId 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Show welcome message for new conversations
  if (!conversationId && messages.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
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

        {/* Initial AI Message */}
        <div className="flex items-start space-x-3 animate-fade-in">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
              <p className="text-gray-900 text-sm leading-relaxed">
                Hi there! 👋 I'm excited to help you create amazing social media content. 
                To get started, I'd love to learn more about you and your brand.
              </p>
              <p className="text-gray-900 text-sm leading-relaxed mt-2">
                What type of content creator are you? Are you focused on a specific niche 
                like fitness, food, tech, lifestyle, or business?
              </p>
            </div>
            <div className="text-xs text-gray-500 mt-1 px-1">Just now</div>
          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      data-testid="message-list"
    >
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`flex items-start space-x-3 animate-fade-in ${
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
            <div className={`text-xs text-gray-500 mt-1 px-1 ${
              message.role === 'user' ? 'text-right' : ''
            }`}>
              {new Date(message.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
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
      ))}

      {/* Streaming message */}
      {(isStreaming || streamingMessage) && (
        <div className="flex items-start space-x-3 animate-fade-in">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
              {streamingMessage ? (
                <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingMessage}
                  <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
                </p>
              ) : (
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 px-1">Just now</div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}