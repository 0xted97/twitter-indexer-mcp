export const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const BASE = 'https://x.com/i/api/graphql';
const API_BASE = 'https://api.x.com';

// GraphQL query IDs — extracted from x.com (2026-03-30)
// These change periodically. Use scripts/get-query-ids.ts to refresh.
const QUERY_IDS = {
  UserTweets: 'FOlovQsiHGDls3c0Q_HaSQ',
  UserTweetsAndReplies: 'E4wA5vo2sjVyvpliUffSCw',
  TweetDetail: 'xOhkmRac04YFZmOzU9PJHg',
  TweetResultByRestId: 'DJS3BdhUhcaEpZ7B7irJDg',
  SearchTimeline: 'GcXk9vN_d1jUfHNqLacXQA',
  UserByScreenName: 'IGgvgiOx4QZndDHuD3x9TQ',
  HomeTimeline: 'xhYBF94fPSp8ey64FfYXiA',
  Followers: 'rRXFSG5vR6drKr5M37YOTw',
  Following: 'iSicc7LrzWGBgDPL0tM_TQ',
} as const;

// Features extracted from x.com (2026-03-30)
// These change periodically. Use scripts/capture-search.ts to refresh.
const DEFAULT_FEATURES = {
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_enhance_cards_enabled: false,
};

function encodeParams(variables: Record<string, unknown>, features?: Record<string, boolean>) {
  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(variables));
  params.set('features', JSON.stringify(features ?? DEFAULT_FEATURES));
  return params.toString();
}

export function buildUserTweetsUrl(userId: string, count: number, cursor?: string): string {
  const variables: Record<string, unknown> = {
    userId,
    count: Math.min(count, 200),
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true,
  };
  if (cursor) variables.cursor = cursor;
  return `${BASE}/${QUERY_IDS.UserTweets}/UserTweets?${encodeParams(variables)}`;
}

export function buildSearchUrl(
  query: string,
  count: number,
  mode: 'Top' | 'Latest',
  cursor?: string
): string {
  const variables: Record<string, unknown> = {
    rawQuery: query,
    count: Math.min(count, 50),
    querySource: 'typed_query',
    product: mode,
    withGrokTranslatedBio: false,
  };
  if (cursor) variables.cursor = cursor;
  return `${BASE}/${QUERY_IDS.SearchTimeline}/SearchTimeline?${encodeParams(variables)}`;
}

export function buildUserByScreenNameUrl(screenName: string): string {
  const variables = { screen_name: screenName, withSafetyModeUserFields: true };
  return `${BASE}/${QUERY_IDS.UserByScreenName}/UserByScreenName?${encodeParams(variables)}`;
}

export function buildTweetDetailUrl(tweetId: string): string {
  const variables = { focalTweetId: tweetId, with_rux_injections: false };
  return `${BASE}/${QUERY_IDS.TweetDetail}/TweetDetail?${encodeParams(variables)}`;
}

export function buildFollowersUrl(userId: string, count: number, cursor?: string): string {
  const variables: Record<string, unknown> = {
    userId,
    count: Math.min(count, 50),
    includePromotedContent: false,
  };
  if (cursor) variables.cursor = cursor;
  return `${BASE}/${QUERY_IDS.Followers}/Followers?${encodeParams(variables)}`;
}

export const TRENDS_URL = `${API_BASE}/2/guide.json?count=20&candidate_source=trends&include_page_configuration=false&entity_tokens=false`;

export const LOGIN_URL = `${API_BASE}/1.1/onboarding/task.json`;
export const VERIFY_CREDENTIALS_URL = `${API_BASE}/1.1/account/verify_credentials.json`;
export const GUEST_ACTIVATE_URL = `${API_BASE}/1.1/guest/activate.json`;

export const LOGIN_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36';
