/**
 * Node.js Indexer for NeuroEscrow Hermes
 * Indexes codebase from repomix-output.md into AstraDB
 * Uses Mistral API for embeddings
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env.local only if exists (local development)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

// Configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const ASTRA_DB_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ASTRA_DB_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;
const EMBEDDING_MODEL = 'codestral-embed-2505';
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 700;

// Validate environment
if (!MISTRAL_API_KEY || !ASTRA_DB_TOKEN || !ASTRA_DB_ENDPOINT) {
    console.error('❌ Missing environment variables in .env.local');
    process.exit(1);
}

/**
 * Make HTTPS request
 */
function httpsRequest(url, options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

/**
 * Get embeddings from Mistral (with batching support)
 */
async function getEmbeddings(texts) {
    const url = new URL('https://api.mistral.ai/v1/embeddings');
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    
    const data = {
        model: EMBEDDING_MODEL,
        input: texts // Array of texts (up to 32)
    };
    
    const response = await httpsRequest(url, options, data);
    return response.data.map(item => item.embedding);
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.message.includes('429') && attempt < maxRetries) {
                const delay = attempt * 2000; // 2s, 4s, 6s
                console.log(`   ⏳ Rate limited, waiting ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

/**
 * Insert document into AstraDB
 */
async function insertDocument(collection, document, vector) {
    const url = new URL(`${ASTRA_DB_ENDPOINT}/api/json/v1/default_keyspace/${collection}`);
    
    const options = {
        method: 'POST',
        headers: {
            'Token': ASTRA_DB_TOKEN,
            'Content-Type': 'application/json'
        }
    };
    
    const payload = {
        insertOne: {
            document: {
                ...document,
                $vector: vector
            }
        }
    };
    
    return await httpsRequest(url, options, payload);
}

/**
 * Parse repomix XML output
 */
function parseRepomix(content) {
    const filePattern = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    const files = [];
    let match;
    
    while ((match = filePattern.exec(content)) !== null) {
        files.push({
            path: match[1],
            content: match[2]
        });
    }
    
    return files;
}

/**
 * Chunk text with overlap
 */
function chunkText(text, filepath) {
    const chunks = [];
    let start = 0;
    let chunkIndex = 0;
    
    while (start < text.length) {
        const end = start + CHUNK_SIZE;
        const chunkText = text.substring(start, end);
        
        // Extract metadata
        const language = detectLanguage(filepath);
        const functions = extractFunctions(chunkText);
        const classes = extractClasses(chunkText);
        
        chunks.push({
            text: chunkText,
            metadata: {
                filepath,
                language,
                functions,
                classes,
                chunk_index: chunkIndex,
                timestamp: new Date().toISOString()
            }
        });
        
        start += (CHUNK_SIZE - CHUNK_OVERLAP);
        chunkIndex++;
    }
    
    return chunks;
}

/**
 * Detect programming language
 */
function detectLanguage(filepath) {
    const ext = path.extname(filepath);
    const map = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.json': 'json',
        '.md': 'markdown'
    };
    return map[ext] || 'unknown';
}

/**
 * Extract function names
 */
function extractFunctions(text) {
    const pattern = /(?:def|function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    const functions = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
        if (!functions.includes(match[1])) {
            functions.push(match[1]);
        }
    }
    
    return functions;
}

/**
 * Extract class names
 */
function extractClasses(text) {
    const pattern = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const classes = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
        if (!classes.includes(match[1])) {
            classes.push(match[1]);
        }
    }
    
    return classes;
}

/**
 * Main indexing function
 */
async function main() {
    console.log('🚀 Starting codebase indexing (Node.js)...\n');
    
    // Read repomix output
    const repomixPath = path.join(__dirname, '..', 'neuroescrow', 'repomix-output.md');
    
    if (!fs.existsSync(repomixPath)) {
        console.error(`❌ Error: ${repomixPath} not found`);
        console.error('Run "npx repomix" first in neuroescrow/ directory');
        process.exit(1);
    }
    
    const repomixContent = fs.readFileSync(repomixPath, 'utf8');
    console.log(`📄 Loaded repomix-output.md (${repomixContent.length} chars)`);
    
    // Parse files
    const files = parseRepomix(repomixContent);
    console.log(`📦 Found ${files.length} files\n`);
    
    let totalChunks = 0;
    let filesIndexed = 0;
    const BATCH_SIZE = 32; // Mistral API supports up to 32 texts per request
    
    // Collect all chunks first
    const allChunks = [];
    
    for (const file of files) {
        // Skip non-code files
        const ext = path.extname(file.path);
        if (!['.py', '.js', '.ts', '.html', '.css'].includes(ext)) {
            continue;
        }
        
        console.log(`🔍 Processing ${file.path}...`);
        
        // Chunk file
        const chunks = chunkText(file.content, file.path);
        allChunks.push(...chunks);
        filesIndexed++;
    }
    
    console.log(`\n📦 Total chunks to index: ${allChunks.length}`);
    console.log(`📦 Batching into groups of ${BATCH_SIZE}...\n`);
    
    // Process in batches
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
        const batch = allChunks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allChunks.length / BATCH_SIZE);
        
        console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);
        
        try {
            // Get embeddings for entire batch with retry
            const embeddings = await retryWithBackoff(async () => {
                return await getEmbeddings(batch.map(c => c.text));
            });
            
            // Insert all documents from batch
            for (let j = 0; j < batch.length; j++) {
                const chunk = batch[j];
                const embedding = embeddings[j];
                
                const document = {
                    text: chunk.text,
                    ...chunk.metadata
                };
                
                await insertDocument('neuroescrow_codebase', document, embedding);
                totalChunks++;
            }
            
            console.log(`   ✅ Batch ${batchNum} indexed successfully`);
            
            // Rate limiting: 2 seconds between batches (for Free Tier)
            if (i + BATCH_SIZE < allChunks.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`   ⚠️  Error indexing batch ${batchNum}: ${error.message}`);
        }
    }
    
    console.log(`\n✅ Indexing complete!`);
    console.log(`   Files indexed: ${filesIndexed}`);
    console.log(`   Chunks created: ${totalChunks}`);
}

// Run
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
