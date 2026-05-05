/**
 * Hermes Self-Awareness Test
 * Tests if Hermes can analyze his own code through RAG
 */

const https = require('https');

const WORKER_URL = process.argv[2] || 'https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev';

const testQuery = {
    message: "Гермес, проанализируй свой собственный код в папке backend/src/. Как работает твоя система модерации и какие коллекции в AstraDB ты используешь?",
    user_id: "test_self_awareness",
    session_id: "test_session"
};

console.log('🧪 Testing Hermes Self-Awareness...\n');
console.log(`📡 Worker URL: ${WORKER_URL}`);
console.log(`❓ Query: "${testQuery.message}"\n`);

const url = new URL(`${WORKER_URL}/chat`);

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(url, options, (res) => {
    let body = '';
    
    res.on('data', chunk => body += chunk);
    
    res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}\n`);
        
        if (res.statusCode === 200) {
            try {
                const data = JSON.parse(body);
                
                console.log('✅ Response received:\n');
                console.log('─'.repeat(60));
                console.log(data.response);
                console.log('─'.repeat(60));
                console.log();
                
                // Check if response mentions key concepts
                const response = data.response.toLowerCase();
                const checks = {
                    'neuroescrow_codebase': response.includes('neuroescrow_codebase'),
                    'neuroescrow_memory': response.includes('neuroescrow_memory'),
                    'moderation': response.includes('moderation') || response.includes('модерац'),
                    'astradb': response.includes('astra') || response.includes('database'),
                    'context_used': data.context_used === true
                };
                
                console.log('🔍 Self-Awareness Checks:');
                console.log(`   ${checks.neuroescrow_codebase ? '✅' : '❌'} Mentions neuroescrow_codebase collection`);
                console.log(`   ${checks.neuroescrow_memory ? '✅' : '❌'} Mentions neuroescrow_memory collection`);
                console.log(`   ${checks.moderation ? '✅' : '❌'} Explains moderation system`);
                console.log(`   ${checks.astradb ? '✅' : '❌'} Mentions AstraDB`);
                console.log(`   ${checks.context_used ? '✅' : '❌'} Used RAG context`);
                console.log();
                
                const passed = Object.values(checks).filter(v => v).length;
                const total = Object.keys(checks).length;
                
                if (passed >= 3) {
                    console.log(`🎉 TEST PASSED! (${passed}/${total} checks)`);
                    console.log('   Hermes successfully analyzed his own code through RAG!');
                } else {
                    console.log(`⚠️  TEST PARTIAL (${passed}/${total} checks)`);
                    console.log('   Hermes responded but may need better context.');
                }
                
            } catch (error) {
                console.error('❌ Failed to parse response:', error.message);
            }
        } else {
            console.error('❌ Request failed:', body);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Worker is deployed');
    console.log('   2. URL is correct');
    console.log('   3. Secrets are set in Cloudflare');
});

req.write(JSON.stringify(testQuery));
req.end();
