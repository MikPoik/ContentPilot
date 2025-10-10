import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 15000;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 100)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim() || disabled || isLoading) return;
    
    onSendMessage(message.trim());
    setMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxChars) {
      setMessage(value);
    }
  };

  const isValid = message.trim().length > 0 && message.length <= maxChars;

  return (
    <div className="border-t border-border bg-card px-2 py-2">
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder=""
            className="min-h-[28px] max-h-[100px] resize-none border border-input rounded-xl px-4 py-1 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-muted-foreground text-sm leading-tight overflow-y-auto bg-background text-foreground"
            disabled={disabled}
            data-testid="input-message"
          />
          
          {/* Character Counter */}
          {/*
          <div className={`absolute bottom-1 right-1 text-xs ${
            message.length > maxChars * 0.9 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {message.length}/{maxChars}
          </div>
          */}
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!isValid || disabled || isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground text-white p-3 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}