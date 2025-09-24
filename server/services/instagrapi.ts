import type { InstagramHashtagResult, InstagramHashtagPost } from '../../shared/schema.js';

interface InstagrapiResponse {
  [key: string]: any;
}

export class InstagrapiService {
  private baseURL = 'https://api.instagrapi.com';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.INSTAGRAPI_API_KEY || process.env.HIKER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('INSTAGRAPI_API_KEY or HIKER_API_KEY environment variable is required');
    }
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-access-key': this.apiKey,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`InstagrapiAPI Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchHashtag(hashtag: string, amount: number = 12): Promise<InstagramHashtagResult> {
    console.log(`🏷️ [INSTAGRAPI] Searching hashtag #${hashtag} with ${amount} posts...`);
    
    // Remove # if provided in hashtag name
    const cleanHashtag = hashtag.replace('#', '');
    
    const response = await this.request<InstagrapiResponse>(`/v1/hashtag/medias/top`, {
      name: cleanHashtag,
      amount: Math.min(amount, 50) // Cap at 50 posts max
    });

    // Parse the response data structure (adjust based on actual API response format)
    const posts: InstagramHashtagPost[] = [];
    
    if (response && Array.isArray(response)) {
      for (const item of response) {
        if (item && typeof item === 'object') {
          posts.push({
            id: item.id || item.pk || String(item.code || Date.now()),
            code: item.code || '',
            caption: item.caption_text || item.caption || '',
            like_count: item.like_count || 0,
            comment_count: item.comment_count || 0,
            media_type: item.media_type || 1,
            taken_at: item.taken_at || Date.now(),
            thumbnail_url: item.thumbnail_url || item.display_url || '',
            username: item.user?.username || item.username || 'unknown',
            user_id: item.user?.pk || item.user_id || ''
          });
        }
      }
    }

    return {
      hashtag: cleanHashtag,
      total_posts: posts.length,
      posts: posts,
      cached_at: new Date().toISOString()
    };
  }
}

export const instagrapiService = new InstagrapiService();