/**
 * Tavily Deep Research - поиск решения проблемы с Cloudflare Workers Secrets
 */

const https = require('https');

const TAVILY_API_KEY = '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';

async function tavilySearch(query) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: query,
      search_depth: 'advanced',
      max_results: 10,
      include_answer: true,
      include_raw_content: false
    });

    const options = {
      hostname: 'api.tavily.com',
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Tavily API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('\n🔍 Tavily Deep Research: Cloudflare Workers Secrets May 2026\n');
  
  const query = 'Cloudflare Workers secrets wrangler-action GitHub Actions May 2026 how to pass secrets properly';
  
  console.log(`Query: ${query}\n`);
  console.log('⏳ Searching...\n');
  
  try {
    const result = await tavilySearch(query);
    
    // AI Answer
    if (result.answer) {
      console.log('=' .repeat(60));
      console.log('📝 AI ANSWER:');
      console.log('='.repeat(60));
      console.log(result.answer);
      console.log('\n');
    }
    
    // Top sources
    if (result.results && result.results.length > 0) {
      console.log('=' .repeat(60));
      console.log(`📚 TOP SOURCES (${result.results.length}):`);
      console.log('='.repeat(60));
      
      result.results.slice(0, 5).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   URL: ${r.url}`);
        console.log(`   Score: ${r.score.toFixed(2)}`);
        if (r.content) {
          console.log(`   Content: ${r.content.substring(0, 200)}...`);
        }
      });
    }
    
    console.log('\n✅ Search complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
