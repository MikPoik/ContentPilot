
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Share2 } from "lucide-react";
import { exportConversation } from "@/lib/exportUtils";
import { type Message } from "@shared/schema";

interface ExportMenuProps {
  messages: Message[];
  conversationTitle?: string;
  conversation?: any;
  disabled?: boolean;
}

export default function ExportMenu({ messages, conversationTitle, conversation, disabled }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Early return to prevent rendering dropdown when no messages or disabled
  if (messages.length === 0 || disabled) {
    return null;
  }

  const handleExport = async (format: 'markdown' | 'txt' | 'json') => {
    if (isExporting || messages.length === 0) return;

    setIsExporting(true);
    try {
      await exportConversation(messages, format, conversationTitle);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('txt')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Export as Text
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
