export interface RawTweet {
  id_str?: string;
  conversation_id_str?: string;
  created_at?: string;
  full_text?: string;
  favorite_count?: number;
  reply_count?: number;
  retweet_count?: number;
  in_reply_to_status_id_str?: string;
  retweeted_status_id_str?: string;
  quoted_status_id_str?: string;
  user_id_str?: string;
  entities?: {
    hashtags?: Array<{ text: string }>;
    urls?: Array<{ expanded_url: string }>;
    user_mentions?: Array<{ screen_name: string; id_str: string }>;
    media?: Array<{ media_url_https: string; type: string }>;
  };
  extended_entities?: {
    media?: Array<{
      media_url_https: string;
      type: string;
      video_info?: { variants: Array<{ url: string; bitrate?: number }> };
    }>;
  };
  ext_views?: { count?: string };
}

export interface RawUser {
  id_str?: string;
  screen_name?: string;
  name?: string;
  description?: string;
  followers_count?: number;
  friends_count?: number;
  verified?: boolean;
}

export interface ParsedTweet {
  id: string;
  userId: string;
  username?: string;
  text: string;
  fullText: string;
  tweetType: 'tweet' | 'reply' | 'retweet' | 'quote';
  replyToId?: string;
  quoteOfId?: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  mediaUrls: string[];
  urls: string[];
  hashtags: string[];
  mentions: string[];
  tweetedAt: Date;
}

export interface ParsedUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
}

export interface TimelineResponse {
  tweets: ParsedTweet[];
  nextCursor?: string;
}

export interface Trend {
  name: string;
  tweetCount?: number;
}
