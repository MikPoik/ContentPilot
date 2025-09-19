import { ExternalLink, Globe } from "lucide-react";

interface SearchCitationsProps {
  citations: string[];
  searchQuery?: string;
}

export default function SearchCitations({ citations, searchQuery }: SearchCitationsProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div 
      className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
      data-testid="search-citations"
    >
      <div className="flex items-center space-x-2 mb-2">
        <Globe className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Sources from web search
        </span>
      </div>
      <div className="space-y-1">
        {citations.map((citation, index) => {
          // Extract domain from URL for cleaner display
          const domain = citation.replace(/^https?:\/\//, '').split('/')[0];
          
          return (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <ExternalLink className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              <a 
                href={citation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 hover:underline truncate"
                data-testid={`citation-link-${index}`}
              >
                {domain}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}