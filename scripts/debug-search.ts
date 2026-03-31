import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';

const FEATURES = {
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

async function main() {
  const client = new TwitterClient();
  client.loadCookiesFromDisk();

  const variables = {
    rawQuery: '$BTC',
    count: 20,
    querySource: 'typed_query',
    product: 'Latest',
    withGrokTranslatedBio: false,
  };

  // Build URL exactly like browser does
  const params = new URLSearchParams();
  params.set('variables', JSON.stringify(variables));
  params.set('features', JSON.stringify(FEATURES));
  const url = `https://x.com/i/api/graphql/GcXk9vN_d1jUfHNqLacXQA/SearchTimeline?${params.toString()}`;

  console.log('Testing with exact browser-like URL...');
  console.log('URL length:', url.length);
  console.log('Full URL:', url);

  const headers = client.getAuthHeaders();
  // Try desktop user agent
  headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const res = await fetch(url, { headers });
  console.log('Status:', res.status, res.statusText);
  console.log('Content-Type:', res.headers.get('content-type'));

  const text = await res.text();
  if (!text) {
    console.log('Empty response');
    return;
  }
  if (text.startsWith('<')) {
    console.log('HTML:', text.slice(0, 200));
    return;
  }
  const data = JSON.parse(text);
  if (data.errors) {
    console.log('Errors:', JSON.stringify(data.errors, null, 2));
    return;
  }
  console.log('Success! Response:', JSON.stringify(data).slice(0, 500));
}

main().catch(console.error);
