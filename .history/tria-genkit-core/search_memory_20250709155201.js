// tria-genkit-core/search_memory.js
const sqlite3 = require('sqlite3');
const path = require('path');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;

// --- UTILITY FUNCTIONS ---
function sanitizeFTS5Query(query) {
    // Удаляем ведущие и завершающие пробелы
    query = query.trim();
    
    // Экранируем двойные кавычки и заключаем в двойные кавычки
    // Это самый надежный способ экранирования для FTS5
    const escapedQuery = query.replace(/"/g, '""');
    return `"${escapedQuery}"`;
}

function buildFlexibleFTS5Query(query) {
    // Разбираем запрос на отдельные термы
    const terms = query.trim().split(/\s+/).filter(term => term.length > 0);
    
    if (terms.length === 0) return '';
    
    if (terms.length === 1) {
        // Для одного терма используем простое экранирование
        return sanitizeFTS5Query(terms[0]);
    }
    
    // Для множественных термов создаем гибкий запрос
    // Комбинируем фразовый поиск с поиском отдельных слов
    const phraseSearch = sanitizeFTS5Query(query);
    const individualTerms = terms.map(term => sanitizeFTS5Query(term)).join(' OR ');
    
    // Приоритет фразовому поиску, fallback на отдельные слова
    return `${phraseSearch} OR (${individualTerms})`;
}

function highlight(text, query) {
    // Simple highlighter for console output
    const terms = query.split(/\s+/).filter(Boolean);
    let highlightedText = text;
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedText = highlightedText.replace(regex, '\x1b[32m$1\x1b[0m'); // Green text
    });
    return highlightedText;
}

function displayResults(rows, originalQuery) {
    rows.forEach((row, index) => {
        console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | Source: ${row.source} | Rank: ${row.adjusted_rank.toFixed(4)}\x1b[0m`);
        console.log(`\x1b[2m${highlight(row.text, originalQuery)}\x1b[0m\n`);
        console.log('--------------------------------------------------\n');
    });
}

// --- CORE SEARCH FUNCTION ---
async function searchMemoryAdvanced(query, options = {}) {
    const {
        limit = 15,
        useFlexibleSearch = true,
        boostPhraseMatches = true
    } = options;

    if (!query || query.trim().length === 0) {
        console.error("\x1b[31mError: Search query cannot be empty.\x1b[0m");
        return [];
    }

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error("\x1b[31mError connecting to the database:\x1b[0m", err.message);
            throw err;
        }
    });

    let matchQuery;
    if (useFlexibleSearch) {
        matchQuery = buildFlexibleFTS5Query(query);
    } else {
        matchQuery = sanitizeFTS5Query(query);
    }

    // Улучшенный SQL с поддержкой релевантности
    const sql = `
        SELECT 
            hm.id, 
            hm.text, 
            hm.source,
            hm.timestamp,
            rank,
            -- Дополнительная метрика релевантности для фразовых совпадений
            CASE 
                WHEN hm.text LIKE '%' || ? || '%' THEN rank * 2
                ELSE rank
            END as adjusted_rank
        FROM memory_fts fts
        JOIN holographic_memory hm ON hm.id = fts.rowid
        WHERE fts.memory_fts MATCH ?
        ORDER BY adjusted_rank DESC
        LIMIT ?;
    `;

    return new Promise((resolve, reject) => {
        const originalQuery = query.trim();
        
        db.all(sql, [originalQuery, matchQuery, limit], (err, rows) => {
            if (err) {
                console.error("\x1b[31mError during search:\x1b[0m", err.message);
                console.error("Query that caused error:", matchQuery);
                reject(err);
            } else {
                resolve(rows);
            }
            db.close();
        });
    });
}

async function searchMemory(query, options = {}) {
    try {
        console.log(`\n\x1b[1m\x1b[34m--- Searching Tria Memory Core for: "${query}" ---\x1b[0m\n`);
        
        const results = await searchMemoryAdvanced(query, options);
        
        if (results.length === 0) {
            console.log("\x1b[33mNo relevant memories found.\x1b[0m");
            
            // Автоматический fallback поиск с упрощенным запросом
            console.log("Trying simplified search...");
            const simplifiedQuery = query.split(/\s+/).join(' OR ');
            const fallbackResults = await searchMemoryAdvanced(simplifiedQuery, {
                ...options,
                useFlexibleSearch: false
            });
            
            if (fallbackResults.length > 0) {
                console.log(`\x1b[32mFound ${fallbackResults.length} results with simplified search:\x1b[0m\n`);
                displayResults(fallbackResults, query);
            }
        } else {
            console.log(`\x1b[32mFound ${results.length} relevant memories:\x1b[0m\n`);
            displayResults(results, query);
        }
    } catch (error) {
        console.error("\x1b[31mSearch failed:\x1b[0m", error.message);
    }
}


// --- SCRIPT EXECUTION ---
const args = process.argv.slice(2);
const searchQuery = args.join(' ');

searchMemory(searchQuery);
