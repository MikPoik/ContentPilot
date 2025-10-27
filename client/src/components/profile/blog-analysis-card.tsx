
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Note: Prefer semantic tokens (bg-card, text-foreground, text-muted-foreground)
// over hardcoded light palette colors so dark mode stays consistent.

interface BlogAnalysisCardProps {
  blogProfile: any;
}

export default function BlogAnalysisCard({ blogProfile }: BlogAnalysisCardProps) {
  // Safely extract string values, handling cases where data might be malformed
  const safeString = (value: any, fallback: string = 'N/A'): string => {
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) return value.join(', ') || fallback;
    if (value && typeof value === 'object') {
      // If it's an object (possibly error structure), return fallback
      return fallback;
    }
    return fallback;
  };

  const safeArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.trim());
    if (typeof value === 'string' && value.trim()) return [value];
    return [];
  };

  const writingStyle = safeString(blogProfile?.writingStyle);
  const brandVoice = safeString(blogProfile?.brandVoice);
  const averagePostLength = safeString(blogProfile?.averagePostLength);
  const targetAudience = safeString(blogProfile?.targetAudience);
  const postingPattern = safeString(blogProfile?.postingPattern);
  const toneKeywords = safeArray(blogProfile?.toneKeywords);
  const contentThemes = safeArray(blogProfile?.contentThemes);
  const commonTopics = safeArray(blogProfile?.commonTopics);
  const analyzedUrls = safeArray(blogProfile?.analyzedUrls);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span>Blog Content Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="text-center p-2 bg-card rounded-lg border">
            <Badge variant="secondary" className="text-xs">Writing Style</Badge>
            <div className="text-xs font-normal text-blue-600 dark:text-blue-400">{writingStyle}</div>
          </div>
          <div className="text-center p-2 bg-card rounded-lg border">
            <Badge variant="secondary" className="text-xs">Avg Post Length</Badge>
            <div className="text-xs font-normal text-blue-600 dark:text-blue-400">{averagePostLength}</div>
            <br/>
            <Badge variant="secondary" className="text-xs">Analyzed Posts</Badge>
            <div className="text-xs font-normal text-blue-600 dark:text-blue-400">{analyzedUrls.length || 0}</div>
          </div>
        </div>
        
        {brandVoice !== 'N/A' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand Voice</label>
            <p className="text-xs font-normal text-foreground bg-card p-2 rounded-lg border">{brandVoice}</p>
          </div>
        )}
        
        {toneKeywords.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tone Keywords</label>
            <div className="flex flex-wrap gap-1">
              {toneKeywords.slice(0, 8).map((keyword: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">{keyword}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {contentThemes.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Themes</label>
            <div className="flex flex-wrap gap-1">
              {contentThemes.map((theme: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">{theme}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {commonTopics.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Common Topics</label>
            <div className="flex flex-wrap gap-1">
              {commonTopics.map((topic: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">{topic}</Badge>
              ))}
            </div>
          </div>
        )}
        
        {targetAudience !== 'N/A' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Audience</label>
            <p className="text-xs text-foreground bg-card p-2 rounded-lg border">{targetAudience}</p>
          </div>
        )}

        {postingPattern !== 'N/A' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Content Pattern</label>
            <p className="text-xs text-foreground bg-card p-2 rounded-lg border">{postingPattern}</p>
          </div>
        )}
        
        {blogProfile?.cached_at && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Last analyzed: {new Date(blogProfile.cached_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
