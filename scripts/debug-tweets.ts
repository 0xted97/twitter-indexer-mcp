import 'dotenv/config';
import { TwitterClient } from '../src/scraper/client.js';
import { buildUserTweetsUrl, buildSearchUrl } from '../src/scraper/endpoints.js';

async function main() {
  const client = new TwitterClient();
  client.loadCookiesFromDisk();

  // Get profile ID first
  const profile = await client.getUserProfile('thuancapital');
  if (!profile) { console.log('Profile not found'); return; }
  console.log(`User ID: ${profile.id}`);

  // Raw user tweets request
  const url = buildUserTweetsUrl(profile.id, 5);
  console.log('\n--- Raw User Tweets Response ---');
  const res = await fetch(url, { headers: client.getAuthHeaders() });
  const data = await res.json() as any;

  // Print structure
  const instructions = data?.data?.user?.result?.timeline_v2?.timeline?.instructions;
  if (instructions) {
    console.log(`Instructions: ${instructions.length}`);
    for (const inst of instructions) {
      console.log(`  type: ${inst.type}, entries: ${inst.entries?.length ?? 'N/A'}`);
      if (inst.entries) {
        for (const entry of inst.entries.slice(0, 3)) {
          console.log(`    entryId: ${entry.entryId}`);
          const result = entry?.content?.itemContent?.tweet_results?.result;
          if (result) {
            console.log(`    has tweet_results: yes, rest_id: ${result.rest_id}`);
            console.log(`    legacy keys: ${Object.keys(result.legacy ?? {}).slice(0, 5).join(', ')}`);
          } else {
            console.log(`    content type: ${entry?.content?.__typename ?? JSON.stringify(Object.keys(entry?.content ?? {})).slice(0, 80)}`);
          }
        }
      }
    }
  } else {
    console.log('No timeline_v2 instructions found');
    console.log('Top-level keys:', Object.keys(data?.data ?? {}));
    console.log('User result keys:', Object.keys(data?.data?.user?.result ?? {}));
    // Check alternative paths
    const timeline = data?.data?.user?.result?.timeline;
    if (timeline) {
      console.log('Found timeline (v1):', Object.keys(timeline));
    }
    console.log('\nRaw response (first 1000 chars):');
    console.log(JSON.stringify(data).slice(0, 1000));
  }

  // Raw search request
  console.log('\n--- Raw Search Response ---');
  const searchUrl = buildSearchUrl('$BTC', 5, 'Latest');
  const searchRes = await fetch(searchUrl, { headers: client.getAuthHeaders() });
  const searchData = await searchRes.json() as any;

  const searchInstr = searchData?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions;
  if (searchInstr) {
    console.log(`Search Instructions: ${searchInstr.length}`);
    for (const inst of searchInstr) {
      console.log(`  type: ${inst.type}, entries: ${inst.entries?.length ?? 'N/A'}`);
    }
  } else {
    console.log('No search timeline found');
    console.log('Raw search (first 1000 chars):');
    console.log(JSON.stringify(searchData).slice(0, 1000));
  }
}

main().catch(console.error);
