
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HashtagSearchCardProps {
  hashtagSearches: any;
}

export default function HashtagSearchCard({ hashtagSearches }: HashtagSearchCardProps) {
  return (
    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7.03 5.03l-.36.36C5.1 6.95 4.5 8.42 4.5 10s.6 3.05 2.17 4.61c.78.78 1.72 1.31 2.75 1.56l-.36.36c-.39.39-.39 1.02 0 1.41.19.2.45.3.71.3s.51-.1.71-.3l.71-.71c.78-.78 1.31-1.72 1.56-2.75.25-1.03.04-2.1-.62-2.97l2.83-2.83c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-2.83 2.83c-.87-.66-1.94-.87-2.97-.62-1.03.25-1.97.78-2.75 1.56zm10.24 10.24l-.36.36c-.39.39-.39 1.02 0 1.41.19.2.45.3.71.3s.51-.1.71-.3l.36-.36C19.9 17.05 20.5 15.58 20.5 14s-.6-3.05-2.17-4.61c-.78-.78-1.72-1.31-2.75-1.56l.36-.36c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-.71.71c-.78.78-1.31 1.72-1.56 2.75-.25 1.03-.04 2.1.62 2.97l-2.83 2.83c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l2.83-2.83c.87.66 1.94.87 2.97.62 1.03-.25 1.97-.78 2.75-1.56z"/>
          </svg>
          <span>Hashtag Searches</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(hashtagSearches).map(([hashtag, searchData]: [string, any], index: number) => (
          <div key={index} className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-sm">#{hashtag}</Badge>
                <Badge variant="outline" className="text-xs">{searchData.total_posts || 0} posts</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {searchData.cached_at && `Searched: ${new Date(searchData.cached_at).toLocaleDateString()}`}
              </div>
            </div>
            
            {searchData.posts && searchData.posts.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Top Posts Found</label>
                  <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                    {searchData.posts.slice(0, 6).map((post: any, postIndex: number) => (
                      <div key={postIndex} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-emerald-700 dark:text-emerald-400">@{post.username}</div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>👍 {post.like_count?.toLocaleString() || 0}</span>
                            <span>💬 {post.comment_count?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                        {post.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {post.caption.length > 120 ? `${post.caption.substring(0, 120)}...` : post.caption}
                          </p>
                        )}
                        {post.taken_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(post.taken_at * 1000).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                  <div className="text-center">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(searchData.posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0) / searchData.posts.length).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(searchData.posts.reduce((sum: number, p: any) => sum + (p.comment_count || 0), 0) / searchData.posts.length).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Array.from(new Set(searchData.posts.map((p: any) => p.username))).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Unique Users</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {searchData.posts.filter((p: any) => p.media_type === 2).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Videos</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
