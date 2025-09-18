import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Globe } from "lucide-react";
import { type Message, type Conversation } from "@shared/schema";
import { exportToMarkdown, exportToHTML, downloadFile, generateFilename } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

interface ExportMenuProps {
  messages: Message[];
  conversation?: Conversation;
  disabled?: boolean;
}

export default function ExportMenu({ messages, conversation, disabled = false }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const handleExport = async (format: 'markdown' | 'html') => {
    if (messages.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Start a conversation first to export it.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let contentType: string;
      
      if (format === 'markdown') {
        content = exportToMarkdown(messages, conversation, {
          includeTimestamps: true,
          includeMetadata: true
        });
        filename = generateFilename(conversation, 'md');
        contentType = 'text/markdown';
      } else {
        content = exportToHTML(messages, conversation, {
          includeTimestamps: true,
          includeMetadata: true
        });
        filename = generateFilename(conversation, 'html');
        contentType = 'text/html';
      }
      
      downloadFile(content, filename, contentType);
      
      toast({
        title: "Export successful",
        description: `Conversation exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your conversation. Please try again.",
        variant: "destructive"
      });
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
          disabled={disabled || isExporting}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          data-testid="button-export-menu"
        >
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleExport('markdown')}
          disabled={isExporting}
          className="cursor-pointer"
          data-testid="export-markdown"
        >
          <FileText className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport('html')}
          disabled={isExporting}
          className="cursor-pointer"
          data-testid="export-html"
        >
          <Globe className="h-4 w-4 mr-2" />
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}