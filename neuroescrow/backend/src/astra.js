/**
 * AstraDB Connector - JavaScript Edition
 */

export class AstraDBConnector {
  constructor(env) {
    this.token = env?.ASTRA_DB_TOKEN;
    this.endpoint = env?.ASTRA_DB_ENDPOINT;
    
    if (!this.token || !this.endpoint) {
      throw new Error(`AstraDB credentials missing: token=${!!this.token}, endpoint=${!!this.endpoint}`);
    }
    
    this.CODEBASE_COLLECTION = 'neuroescrow_codebase';
    this.MEMORY_COLLECTION = 'neuroescrow_memory';
  }
  
  async insertDocument(collectionName, document, vector = null) {
    const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
    
    const payload = {
      insertOne: {
        document: {
          ...document,
          ...(vector ? { $vector: vector } : {})
        }
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Token': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`AstraDB insert error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.status?.insertedIds?.[0];
  }
  
  async vectorSearch(collectionName, queryVector, limit = 5, filter = null, includeSimilarity = true) {
    const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
    
    const payload = {
      find: {
        sort: { $vector: queryVector },
        options: {
          limit,
          includeSimilarity
        }
      }
    };
    
    if (filter) {
      payload.find.filter = filter;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Token': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`AstraDB search error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.documents || [];
  }
  
  async deleteByFilter(collectionName, filter) {
    const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
    
    const payload = {
      deleteMany: { filter }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Token': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`AstraDB delete error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.status?.deletedCount || 0;
  }
  
  async getStats(collectionName) {
    const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
    
    const payload = {
      countDocuments: {}
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Token': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      return {
        collection: collectionName,
        document_count: 0,
        status: 'error'
      };
    }
    
    const data = await response.json();
    const count = data.status?.count || 0;
    
    return {
      collection: collectionName,
      document_count: count,
      status: 'healthy'
    };
  }
}
