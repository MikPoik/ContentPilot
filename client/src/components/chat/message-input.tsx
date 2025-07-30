import { useState, useRef } from "react";
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
  const maxChars = 500;

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
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const isValid = message.trim().length > 0 && message.length <= maxChars;

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4">
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell me about your content goals, target audience, or ask for specific ideas..."
            className="min-h-[44px] max-h-[120px] resize-none border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-500 text-sm leading-relaxed"
            disabled={disabled}
            data-testid="input-message"
          />
          
          {/* Character Counter */}
          <div className={`absolute bottom-1 right-12 text-xs ${
            message.length > maxChars * 0.9 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {message.length}/{maxChars}
          </div>
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!isValid || disabled || isLoading}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white p-3 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}