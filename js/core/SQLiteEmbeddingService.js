// frontend/js/core/SQLiteEmbeddingService.js
    import initSqlJs from 'sql.js';

    export class HolographicSQLiteService {
      constructor() {
        this.db = null;
        this.isInitialized = false;
      }

      async initialize() {
        if (this.isInitialized) return;
        console.log(' Initializing SQL.js...');
        
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        this.db = new SQL.Database();
        
        // Create the embeddings table
        this.db.exec(`
          CREATE TABLE embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            embedding TEXT
          );
        `);
        console.log('✅ SQLite DB and table created.');
        this.isInitialized = true;
      }

      async migrateFromJson(path) {
       if (!this.isInitialized) throw new Error('DB not initialized');
       console.log(` Migrating embeddings from ${path} to SQLite...`);
       
       const response = await fetch(path);
       const embeddingsArray = await response.json();
       
       // sql.js batch insertion approach
       const batchSize = 100;
       let totalInserted = 0;
       
       for (let i = 0; i < embeddingsArray.length; i += batchSize) {
           const batch = embeddingsArray.slice(i, i + batchSize);
           this.db.exec("BEGIN TRANSACTION");
           try {
               const stmt = this.db.prepare("INSERT INTO embeddings (text, embedding) VALUES (?, ?)");
               for (const emb of batch) {
                   stmt.run([emb.text, JSON.stringify(emb.embedding)]);
               }
               stmt.free();
               this.db.exec("COMMIT");
               
               totalInserted += batch.length;
               console.log(`...migrated ${totalInserted} of ${embeddingsArray.length} embeddings.`);
               // Yield to the main thread to prevent UI freezing
               await new Promise(resolve => setTimeout(resolve, 0));
           } catch (error) {
               this.db.exec("ROLLBACK");
               console.error(`Batch insertion failed at ${i}:`, error);
               throw error;
           }
       }
       
       const count = this.db.exec("SELECT COUNT(*) FROM embeddings")[0].values[0][0];
       console.log(`✅ Migration complete. Total embeddings in DB: ${count}`);
       return count;
   }
    }