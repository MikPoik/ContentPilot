import { type Message, type Conversation } from "@shared/schema";

export interface ExportOptions {
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
  title?: string;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function exportToMarkdown(
  messages: Message[], 
  conversation?: Conversation, 
  options: ExportOptions = {}
): string {
  const { includeTimestamps = true, includeMetadata = false, title } = options;
  
  let markdown = '';
  
  // Header
  const conversationTitle = title || conversation?.title || 'Conversation Export';
  markdown += `# ${conversationTitle}\n\n`;
  
  if (conversation?.createdAt) {
    markdown += `*Exported on ${formatDate(new Date())}*\n`;
    markdown += `*Conversation started on ${formatDate(conversation.createdAt)}*\n\n`;
  }
  
  markdown += '---\n\n';
  
  // Messages
  messages.forEach((message, index) => {
    const isUser = message.role === 'user';
    const roleName = isUser ? 'You' : 'ContentCraft AI';
    
    markdown += `## ${roleName}\n\n`;
    
    if (includeTimestamps && message.createdAt) {
      markdown += `*${formatDate(message.createdAt)}*\n\n`;
    }
    
    markdown += `${message.content}\n\n`;
    
    // Add citations if available
    if (includeMetadata && message.metadata?.citations && message.metadata.citations.length > 0) {
      markdown += `**Sources:**\n`;
      message.metadata.citations.forEach((citation, idx) => {
        markdown += `${idx + 1}. ${citation}\n`;
      });
      markdown += '\n';
    }
    
    // Add separator between messages (except last)
    if (index < messages.length - 1) {
      markdown += '---\n\n';
    }
  });
  
  return markdown;
}

export function exportToHTML(
  messages: Message[], 
  conversation?: Conversation, 
  options: ExportOptions = {}
): string {
  const { includeTimestamps = true, includeMetadata = false, title } = options;
  
  const conversationTitle = title || conversation?.title || 'Conversation Export';
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${conversationTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #ffffff;
            color: #374151;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }
        .title {
            font-size: 2rem;
            font-weight: bold;
            margin: 0;
            color: #111827;
        }
        .meta {
            color: #6b7280;
            font-style: italic;
            margin-top: 0.5rem;
        }
        .message {
            margin-bottom: 2rem;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .message.user {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            margin-left: 2rem;
        }
        .message.assistant {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            margin-right: 2rem;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        .message.user .message-header {
            color: #ecfdf5;
        }
        .message.assistant .message-header {
            color: #059669;
        }
        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 0.75rem;
            font-size: 16px;
        }
        .message.user .avatar {
            background: rgba(255, 255, 255, 0.2);
        }
        .message.assistant .avatar {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        .timestamp {
            font-size: 0.875rem;
            color: #6b7280;
            margin-left: auto;
        }
        .message.user .timestamp {
            color: rgba(255, 255, 255, 0.8);
        }
        .content {
            white-space: pre-wrap;
        }
        .citations {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
        }
        .citations h4 {
            margin: 0 0 0.5rem 0;
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
        }
        .citations ul {
            margin: 0;
            padding-left: 1.5rem;
        }
        .citations li {
            font-size: 0.875rem;
            margin-bottom: 0.25rem;
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${conversationTitle}</h1>`;
        
  if (conversation?.createdAt) {
    html += `
        <div class="meta">Exported on ${formatDate(new Date())}</div>
        <div class="meta">Conversation started on ${formatDate(conversation.createdAt)}</div>`;
  }
  
  html += `
    </div>
    <div class="messages">`;
  
  messages.forEach((message) => {
    const isUser = message.role === 'user';
    const roleName = isUser ? 'You' : 'ContentCraft AI';
    const messageClass = isUser ? 'user' : 'assistant';
    const avatar = isUser ? '👤' : '🤖';
    
    html += `
        <div class="message ${messageClass}">
            <div class="message-header">
                <div class="avatar">${avatar}</div>
                <span>${roleName}</span>`;
                
    if (includeTimestamps && message.createdAt) {
      html += `<span class="timestamp">${formatDate(message.createdAt)}</span>`;
    }
    
    html += `
            </div>
            <div class="content">${message.content.replace(/\n/g, '<br>')}</div>`;
            
    // Add citations if available
    if (includeMetadata && message.metadata?.citations && message.metadata.citations.length > 0) {
      html += `
            <div class="citations">
                <h4>Sources:</h4>
                <ul>`;
      message.metadata.citations.forEach((citation) => {
        html += `<li>${citation}</li>`;
      });
      html += `
                </ul>
            </div>`;
    }
    
    html += `
        </div>`;
  });
  
  html += `
    </div>
    <div class="footer">
        Generated by ContentCraft AI
    </div>
</body>
</html>`;
  
  return html;
}

export function downloadFile(content: string, filename: string, contentType: string = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generateFilename(conversation?: Conversation, format: 'md' | 'html' = 'md'): string {
  const title = conversation?.title || 'conversation';
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
    
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitizedTitle}-${timestamp}.${format}`;
}

export async function exportConversation(
  messages: Message[], 
  format: 'markdown' | 'txt' | 'json', 
  conversationTitle?: string
) {
  const title = conversationTitle || 'Conversation Export';
  let content: string;
  let filename: string;
  let contentType: string;

  switch (format) {
    case 'markdown':
      content = exportToMarkdown(messages, undefined, { title });
      filename = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
      contentType = 'text/markdown';
      break;
    
    case 'txt':
      content = messages
        .map(msg => `${msg.role === 'user' ? 'You' : 'ContentCraft AI'}: ${msg.content}`)
        .join('\n\n---\n\n');
      filename = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
      contentType = 'text/plain';
      break;
    
    case 'json':
      content = JSON.stringify({
        title,
        exportedAt: new Date().toISOString(),
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt
        }))
      }, null, 2);
      filename = `${title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      contentType = 'application/json';
      break;
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  downloadFile(content, filename, contentType);
}