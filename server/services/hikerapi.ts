import type { InstagramProfile, InstagramPost, InstagramAccount } from '../../shared/schema.js';

interface HikerAPIResponse<T = any> {
  user?: T;
  [key: string]: any;
}

interface HikerAPIUserData {
  pk: string;
  username: string;
  full_name: string;
  biography: string;
  category: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  profile_pic_url: string;
  is_verified: boolean;
}

export class HikerAPIService {
  private baseURL = 'https://api.hikerapi.com';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.HIKER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('HIKER_API_KEY environment variable is required');
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
      throw new Error(`HikerAPI Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUserByUsername(username: string): Promise<HikerAPIUserData> {
    const response = await this.request<HikerAPIResponse>(`/v2/user/by/username`, {
      username: username
    });
    if (!response.user) {
      throw new Error(`User not found: ${username}`);
    }
    return response.user;
  }

  async getUserMediasChunk(userId: string, endCursor?: string): Promise<{ medias: InstagramPost[], endCursor: string | null }> {
    const response = await this.request<InstagramPost[][]>('/v1/user/medias/chunk', {
      user_id: userId,
      end_cursor: endCursor
    });

    const medias: InstagramPost[] = [];
    let newEndCursor: string | null = null;

    if (response && Array.isArray(response) && response.length > 0) {
      for (const mediaGroup of response) {
        if (Array.isArray(mediaGroup)) {
          for (const item of mediaGroup) {
            if (typeof item === 'object' && item !== null && 'pk' in item) {
              medias.push(item as InstagramPost);
            }
          }
        }
      }

      // Extract end cursor from the last item if it's a string
      const lastGroup = response[response.length - 1];
      if (Array.isArray(lastGroup) && lastGroup.length > 0) {
        const lastItem = lastGroup[lastGroup.length - 1];
        if (typeof lastItem === 'string') {
          newEndCursor = lastItem;
        }
      }
    }

    return { medias, endCursor: newEndCursor };
  }

  async getAllUserMedias(userId: string, maxAmount: number = 50): Promise<InstagramPost[]> {
    const allMedias: InstagramPost[] = [];
    let endCursor: string | null = null;

    while (allMedias.length < maxAmount) {
      try {
        const { medias, endCursor: newEndCursor } = await this.getUserMediasChunk(userId, endCursor || undefined);
        
        if (medias.length === 0) break;
        
        allMedias.push(...medias.slice(0, maxAmount - allMedias.length));
        endCursor = newEndCursor;
        
        if (!endCursor) break;
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error fetching media chunk:', error);
        break;
      }
    }

    return allMedias;
  }

  async getRelatedProfiles(username: string): Promise<any[]> {
    try {
      const response = await this.request<any[]>('/gql/user/related/profiles', {
        username: username
      });
      return Array.isArray(response) ? response.slice(0, 5) : [];
    } catch (error) {
      console.error('Error fetching related profiles:', error);
      return [];
    }
  }

  async analyzeInstagramProfile(username: string): Promise<InstagramProfile> {
    const userProfile = await this.getUserByUsername(username);
    const posts = await this.getAllUserMedias(userProfile.pk, 20);
    
    // Analyze posts for hashtags and engagement
    const hashtags: string[] = [];
    const likes: number[] = [];
    const comments: number[] = [];
    const postTexts: string[] = [];

    for (const post of posts) {
      if (post.caption_text) {
        const cleanText = post.caption_text.split('#')[0].trim();
        if (cleanText) {
          postTexts.push(cleanText);
        }
        
        const postHashtags = post.caption_text
          .split(' ')
          .filter(word => word.startsWith('#'))
          .map(tag => tag.substring(1));
        hashtags.push(...postHashtags);
      }
      
      likes.push(post.like_count || 0);
      comments.push(post.comment_count || 0);
    }

    // Calculate engagement metrics
    const avgLikes = likes.length > 0 ? likes.reduce((a, b) => a + b, 0) / likes.length : 0;
    const avgComments = comments.length > 0 ? comments.reduce((a, b) => a + b, 0) / comments.length : 0;
    const engagementRate = userProfile.follower_count > 0 
      ? ((avgLikes + avgComments) / userProfile.follower_count) * 100 
      : 0;

    // Get top hashtags
    const hashtagCounts = hashtags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topHashtags = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    // Analyze similar accounts
    const similarAccountsData = await this.getRelatedProfiles(userProfile.username);
    const similarAccounts: InstagramAccount[] = [];

    for (const accountData of similarAccountsData.slice(0, 3)) {
      try {
        if (accountData.username) {
          const similarProfile = await this.getUserByUsername(accountData.username);
          const similarPosts = await this.getAllUserMedias(similarProfile.pk, 10);
          
          const similarLikes = similarPosts.map(p => p.like_count || 0);
          const similarComments = similarPosts.map(p => p.comment_count || 0);
          const similarHashtags: string[] = [];
          const similarPostTexts: string[] = [];

          for (const post of similarPosts) {
            if (post.caption_text) {
              const cleanText = post.caption_text.split('#')[0].trim();
              if (cleanText) similarPostTexts.push(cleanText);
              
              const tags = post.caption_text
                .split(' ')
                .filter(word => word.startsWith('#'))
                .map(tag => tag.substring(1));
              similarHashtags.push(...tags);
            }
          }

          const similarAvgLikes = similarLikes.length > 0 ? similarLikes.reduce((a, b) => a + b, 0) / similarLikes.length : 0;
          const similarAvgComments = similarComments.length > 0 ? similarComments.reduce((a, b) => a + b, 0) / similarComments.length : 0;
          const similarEngagementRate = similarProfile.follower_count > 0 
            ? ((similarAvgLikes + similarAvgComments) / similarProfile.follower_count) * 100 
            : 0;

          const similarHashtagCounts = similarHashtags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const similarTopHashtags = Object.entries(similarHashtagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([tag]) => tag);

          similarAccounts.push({
            username: similarProfile.username,
            full_name: similarProfile.full_name || '',
            category: similarProfile.category || '',
            followers: similarProfile.follower_count,
            engagement_rate: similarEngagementRate,
            avg_likes: similarAvgLikes,
            avg_comments: similarAvgComments,
            top_hashtags: similarTopHashtags,
            post_texts: similarPostTexts
          });
        }
      } catch (error) {
        console.error(`Error analyzing similar account ${accountData.username}:`, error);
      }
    }

    return {
      username: userProfile.username,
      full_name: userProfile.full_name || '',
      biography: userProfile.biography || '',
      category: userProfile.category || '',
      followers: userProfile.follower_count,
      following: userProfile.following_count,
      posts: userProfile.media_count,
      top_hashtags: topHashtags,
      engagement_rate: engagementRate,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      similar_accounts: similarAccounts,
      post_texts: postTexts,
      profile_pic_url: userProfile.profile_pic_url,
      is_verified: userProfile.is_verified,
      cached_at: new Date().toISOString()
    };
  }
}

export const hikerApiService = new HikerAPIService();