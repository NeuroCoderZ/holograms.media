/* GestureVectorStore.js
 * TriaLearningEngine — Gesture Vector Store
 * API:
 *  - async init(options)
 *  - normalize(hand21)
 *  - addGesture(name, hand21, metadata)
 *  - query(vector, topK=5, minScore=0.7)
 *  - remove(id), get(id), list(offset,limit)
 *  - export()/import()
 *
 * Storage: prefer sql.js (window.initSqlJs), fallback to IndexedDB.
 * Vectors stored as Float32Array, serialized to Base64 for persistence.
 * Cosine similarity used; vectors are L2-normalized before storage.
 */

class GestureVectorStore {
  constructor() {
    this.backend = null; // 'sqljs' or 'indexeddb'
    this.db = null; // sql.js db or indexeddb db handle
    this.sql = null; // sql.js module
    this.storeName = 'gestures';
    this._pca = null; // {components: Float32Array, mean: Float32Array, nComponents}
    this.dim = 42; // default (21 * 2). If z included -> 63
    this.includeZ = false;
  }

  // -----------------
  // Public API
  // -----------------
  async init(options = {}) {
    // options: {includeZ:false, persistKey:'GestureVectorStore.sqlite'}
    this.includeZ = !!options.includeZ;
    this.dim = this.includeZ ? 21 * 3 : 21 * 2;
    this.persistKey = options.persistKey || 'GestureVectorStore.sqlite';
    // try sql.js
    if (typeof window !== 'undefined' && typeof window.initSqlJs === 'function') {
      try {
        this.sql = await window.initSqlJs({locateFile: file => file});
        // load saved db from localStorage if present
        const saved = localStorage.getItem(this.persistKey);
        if (saved) {
          const u8 = GestureVectorStore._base64ToUint8Arr(saved);
          this.db = new this.sql.Database(u8);
        } else {
          this.db = new this.sql.Database();
        }
        // create table
        this.db.run(`CREATE TABLE IF NOT EXISTS ${this.storeName}(\n          id TEXT PRIMARY KEY,\n          name TEXT,\n          vector BLOB,\n          metadata TEXT,\n          created_at INT\n        )`);
        this.backend = 'sqljs';
        // ensure a save hook
        window.addEventListener('beforeunload', () => this._persistSqljs());
        return Promise.resolve();
      } catch (e) {
        console.warn('sql.js init failed, falling back to IndexedDB', e);
      }
    }
    // fallback: IndexedDB
    return this._initIndexedDB();
  }

  async normalize(hand21, opts = {}) {
    // hand21: array of 21 landmarks {x,y,z} (MediaPipe). We'll assume wrist index 0.
    // opts: {align:true, includeZ:bool}
    const includeZ = ('includeZ' in opts) ? !!opts.includeZ : this.includeZ;
    // normalize landmarks -> center, scale, PCA-align
    if (!Array.isArray(hand21) || hand21.length < 21) {
      throw new Error('hand21 must be array of 21 landmarks');
    }
    // map to floats
    const pts = hand21.slice(0,21).map(p => ({
      x: typeof p.x === 'number' ? p.x : p[0],
      y: typeof p.y === 'number' ? p.y : p[1],
      z: (includeZ && typeof p.z === 'number') ? p.z : 0
    }));
    const wrist = pts[0];
    // translate so wrist at origin
    for (let p of pts) { p.x -= wrist.x; p.y -= wrist.y; p.z -= wrist.z; }
    // scale by hand size: max distance from wrist or distance wrist-middle_mcp (index 9)
    const dists = pts.map(p => Math.hypot(p.x, p.y, p.z));
    const middleIdx = 9; // MediaPipe middle_finger_mcp
    const scaleRef = Math.max(1e-6, Math.hypot(pts[middleIdx].x, pts[middleIdx].y, pts[middleIdx].z));
    const maxDist = Math.max(...dists, scaleRef);
    const scale = maxDist || 1.0;
    for (let p of pts) { p.x /= scale; p.y /= scale; p.z /= scale; }

    // PCA align on 2D (x,y)
    if (opts.align !== false) {
      const mat = pts.map(p => [p.x, p.y]);
      const mean = [0,0]; // already centered
      // compute covariance
      const cov = [[0,0],[0,0]];
      for (let i=0;i<mat.length;i++){
        cov[0][0] += mat[i][0]*mat[i][0];
        cov[0][1] += mat[i][0]*mat[i][1];
        cov[1][0] += mat[i][1]*mat[i][0];
        cov[1][1] += mat[i][1]*mat[i][1];
      }
      // power iteration to find principal eigenvector
      let vx = 1, vy = 0;
      for (let it=0; it<20; it++){
        const nx = cov[0][0]*vx + cov[0][1]*vy;
        const ny = cov[1][0]*vx + cov[1][1]*vy;
        const norm = Math.hypot(nx, ny) || 1e-9;
        vx = nx/norm; vy = ny/norm;
      }
      // compute angle to x-axis
      const angle = Math.atan2(vy, vx);
      // rotate by -angle
      const cos = Math.cos(-angle), sin = Math.sin(-angle);
      for (let p of pts) {
        const x = p.x, y = p.y;
        p.x = x * cos - y * sin;
        p.y = x * sin + y * cos;
      }
    }

    // flatten to Float32Array: [x0,y0,(z0,) x1,y1,...]
    const out = new Float32Array(includeZ ? 21*3 : 21*2);
    for (let i=0;i<21;i++){
      const p = pts[i];
      out[i*(includeZ?3:2)+0] = p.x;
      out[i*(includeZ?3:2)+1] = p.y;
      if (includeZ) out[i*3+2] = p.z;
    }
    return out;
  }

  async addGesture(name, hand21, metadata={}){
    const vec = await this.normalize(hand21);
    // apply PCA if available
    const storeVec = this._applyPcaIfNeeded(vec);
    const normalized = GestureVectorStore._l2Normalize(storeVec);
    const id = GestureVectorStore._randomId();
    const created_at = Date.now();
    const metaStr = JSON.stringify(metadata||{});
    if (this.backend === 'sqljs'){
      const blob = GestureVectorStore._float32ToUint8(normalized);
      // insert
      const stmt = this.db.prepare(`INSERT INTO ${this.storeName} (id,name,vector,metadata,created_at) VALUES (?,?,?,?,?);`);
      stmt.bind([id, name, blob, metaStr, created_at]);
      stmt.step();
      stmt.free();
      this._persistSqljs();
      return id;
    } else {
      return await new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        const rec = {id, name, vector: GestureVectorStore._float32ToBase64(normalized), metadata: metaStr, created_at};
        const req = store.add(rec);
        req.onsuccess = ()=> resolve(id);
        req.onerror = e => reject(e);
      });
    }
  }

  async query(vector, topK=5, minScore=0.7){
    // vector: Float32Array or raw hand21 -> normalize first
    let qv;
    if (arrayIsHand21Like(vector)) qv = await this.normalize(vector);
    else qv = (vector instanceof Float32Array) ? vector : new Float32Array(vector);
    qv = this._applyPcaIfNeeded(qv);
    qv = GestureVectorStore._l2Normalize(qv);
    // fetch all entries and compute cosine
    const results = [];
    if (this.backend === 'sqljs'){
      const res = this.db.exec(`SELECT id,name,vector,metadata,created_at FROM ${this.storeName}`);
      if (res && res[0]){
        const rows = res[0];
        // rows.values is array of rows
        for (const row of rows.values){
          const id = row[0], name = row[1], blob = row[2], metadata = row[3], created_at = row[4];
          const fv = GestureVectorStore._uint8ToFloat32(blob);
          const score = GestureVectorStore._cosineScore(qv, fv);
          if (score >= minScore) results.push({id,name,metadata: JSON.parse(metadata||'{}'),created_at,score});
        }
      }
    } else {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor();
        req.onsuccess = e => {
          const cursor = e.target.result;
          if (cursor) {
            const rec = cursor.value;
            const fv = GestureVectorStore._base64ToFloat32(rec.vector);
            const score = GestureVectorStore._cosineScore(qv, fv);
            if (score >= minScore) results.push({id:rec.id,name:rec.name,metadata: JSON.parse(rec.metadata||'{}'),created_at:rec.created_at,score});
            cursor.continue();
          } else resolve();
        };
        req.onerror = e => reject(e);
      });
    }
    results.sort((a,b)=>b.score-a.score);
    return results.slice(0, topK);
  }

  async remove(id){
    if (this.backend === 'sqljs'){
      const stmt = this.db.prepare(`DELETE FROM ${this.storeName} WHERE id = ?`);
      stmt.bind([id]); stmt.step(); stmt.free(); this._persistSqljs(); return true;
    } else {
      return await new Promise((resolve,reject)=>{
        const tx = this.db.transaction([this.storeName],'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(id);
        req.onsuccess = ()=> resolve(true);
        req.onerror = e=> reject(e);
      });
    }
  }

  async get(id){
    if (this.backend === 'sqljs'){
      const res = this.db.exec(`SELECT id,name,vector,metadata,created_at FROM ${this.storeName} WHERE id = '${id}'`);
      if (res && res[0] && res[0].values.length) {
        const row = res[0].values[0];
        return {id:row[0],name:row[1],vector:GestureVectorStore._uint8ToFloat32(row[2]),metadata:JSON.parse(row[3]||'{}'),created_at:row[4]};
      }
      return null;
    } else {
      return await new Promise((resolve,reject)=>{
        const tx = this.db.transaction([this.storeName],'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);
        req.onsuccess = e=>{
          const rec = e.target.result;
          if (!rec) return resolve(null);
          resolve({id:rec.id,name:rec.name,vector:GestureVectorStore._base64ToFloat32(rec.vector),metadata:JSON.parse(rec.metadata||'{}'),created_at:rec.created_at});
        };
        req.onerror = e=>reject(e);
      });
    }
  }

  async list(offset=0, limit=100){
    const out = [];
    if (this.backend === 'sqljs'){
      const res = this.db.exec(`SELECT id,name,vector,metadata,created_at FROM ${this.storeName} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
      if (res && res[0]){
        for (const row of res[0].values){
          out.push({id:row[0],name:row[1],vector:GestureVectorStore._uint8ToFloat32(row[2]),metadata:JSON.parse(row[3]||'{}'),created_at:row[4]});
        }
      }
    } else {
      await new Promise((resolve,reject)=>{
        const tx = this.db.transaction([this.storeName],'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor(null,'prev');
        let skipped = 0;
        req.onsuccess = e=>{
          const cursor = e.target.result;
          if (cursor && out.length < limit){
            if (skipped < offset){ skipped++; cursor.continue(); return; }
            const rec = cursor.value;
            out.push({id:rec.id,name:rec.name,vector:GestureVectorStore._base64ToFloat32(rec.vector),metadata:JSON.parse(rec.metadata||'{}'),created_at:rec.created_at});
            cursor.continue();
          } else resolve();
        };
        req.onerror = e=>reject(e);
      });
    }
    return out;
  }

  async export(){
    const all = await this.list(0, Number.MAX_SAFE_INTEGER);
    // serialize vectors to base64 already done in storage; ensure metadata string
    const payload = all.map(r=>({id:r.id,name:r.name,vector:GestureVectorStore._float32ToBase64(r.vector),metadata:r.metadata,created_at:r.created_at}));
    const json = JSON.stringify({created:Date.now(),version:1,records:payload});
    return json;
  }

  async import(jsonStr, {merge=true} = {}){
    const obj = (typeof jsonStr==='string') ? JSON.parse(jsonStr) : jsonStr;
    if (!obj.records) throw new Error('Invalid import format');
    for (const rec of obj.records){
      const id = rec.id || GestureVectorStore._randomId();
      const vec = GestureVectorStore._base64ToFloat32(rec.vector);
      const normalized = GestureVectorStore._l2Normalize(this._applyPcaIfNeeded(vec));
      const metaStr = typeof rec.metadata === 'string' ? rec.metadata : JSON.stringify(rec.metadata||{});
      const created_at = rec.created_at || Date.now();
      if (this.backend === 'sqljs'){
        const blob = GestureVectorStore._float32ToUint8(normalized);
        const stmt = this.db.prepare(`INSERT OR ${merge ? 'REPLACE' : 'IGNORE'} INTO ${this.storeName}(id,name,vector,metadata,created_at) VALUES (?,?,?,?,?)`);
        stmt.bind([id, rec.name, blob, metaStr, created_at]); stmt.step(); stmt.free();
      } else {
        await new Promise((resolve,reject)=>{
          const tx = this.db.transaction([this.storeName],'readwrite');
          const store = tx.objectStore(this.storeName);
          const record = {id,name:rec.name,vector:GestureVectorStore._float32ToBase64(normalized),metadata:metaStr,created_at};
          const req = merge ? store.put(record) : store.add(record);
          req.onsuccess = ()=>resolve(); req.onerror = e=>reject(e);
        });
      }
    }
    if (this.backend === 'sqljs') this._persistSqljs();
    return true;
  }

  // -----------------
  // PCA helpers
  // -----------------
  computePCA(nComponents=24){
    // compute PCA on stored vectors; returns components and mean
    // fetch all vectors
    return this.list(0, Number.MAX_SAFE_INTEGER).then(recs=>{
      if (!recs.length) throw new Error('no records for PCA');
      const mat = new Float32Array(recs.length * recs[0].vector.length);
      const dim = recs[0].vector.length;
      for (let i=0;i<recs.length;i++){
        mat.set(recs[i].vector, i*dim);
      }
      // compute mean
      const mean = new Float32Array(dim);
      for (let j=0;j<dim;j++){
        let s=0; for (let i=0;i<recs.length;i++) s += mat[i*dim + j]; mean[j] = s/recs.length;
      }
      // center
      for (let i=0;i<recs.length;i++) for (let j=0;j<dim;j++) mat[i*dim+j] -= mean[j];
      // compute cov = (X^T X) / (n-1)
      const cov = new Float64Array(dim*dim);
      for (let i=0;i<recs.length;i++){
        for (let a=0;a<dim;a++){
          const v = mat[i*dim+a];
          for (let b=0;b<dim;b++) cov[a*dim+b] += v * mat[i*dim+b];
        }
      }
      const denom = recs.length - 1 || 1;
      for (let k=0;k<cov.length;k++) cov[k] /= denom;
      // power iteration for k components with deflation
      const components = new Float32Array(dim * Math.min(nComponents, dim));
      const used = new Float64Array(dim); // temp
      for (let c=0;c<components.length/dim;c++){
        // random initial vector
        let v = new Float64Array(dim); for (let i=0;i<dim;i++) v[i] = Math.random()-0.5;
        // power iter
        for (let it=0; it<50; it++){
          // w = cov * v
          const w = new Float64Array(dim);
          for (let a=0;a<dim;a++){
            let s=0; const off=a*dim;
            for (let b=0;b<dim;b++) s += cov[off + b]*v[b];
            w[a]=s;
          }
          // orthogonalize against previous components
          for (let p=0;p<c;p++){
            let dot=0; for (let i=0;i<dim;i++) dot += components[p*dim+i]*w[i];
            for (let i=0;i<dim;i++) w[i] -= dot * components[p*dim+i];
          }
          // normalize w
          let norm = 0; for (let i=0;i<dim;i++) norm += w[i]*w[i]; norm = Math.sqrt(norm)||1e-9;
          for (let i=0;i<dim;i++) v[i] = w[i]/norm;
        }
        // store component
        for (let i=0;i<dim;i++) components[c*dim+i] = v[i];
        // deflate cov (approx) by removing component contribution: cov -= lambda * v v^T
        // compute lambda = v^T cov v
        let lambda = 0; for (let a=0;a<dim;a++){ let s=0; const off=a*dim; for (let b=0;b<dim;b++) s += cov[off+b]*v[b]; lambda += v[a]*s; }
        for (let a=0;a<dim;a++){ const off=a*dim; for (let b=0;b<dim;b++) cov[off+b] -= lambda * v[a]*v[b]; }
      }
      this._pca = {components, mean, nComponents: components.length/dim, dim};
      return this._pca;
    });
  }

  _applyPcaIfNeeded(vec){
    if (!this._pca) return vec;
    const dim = this._pca.dim;
    const k = this._pca.nComponents;
    const out = new Float32Array(k);
    for (let i=0;i<k;i++){
      let s=0; for (let j=0;j<dim;j++) s += this._pca.components[i*dim + j] * (vec[j] - this._pca.mean[j]); out[i] = s;
    }
    return out;
  }

  // -----------------
  // Persistence: IndexedDB
  // -----------------
  _initIndexedDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open('GestureVectorStore_v1', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)){
          const store = db.createObjectStore(this.storeName, {keyPath:'id'});
          store.createIndex('created_at','created_at',{unique:false});
        }
      };
      req.onsuccess = e => { this.db = e.target.result; this.backend = 'indexeddb'; resolve(); };
      req.onerror = e => { reject(e); };
    });
  }

  _persistSqljs(){
    try{
      const data = this.db.export();
      const b64 = GestureVectorStore._uint8ToBase64(data);
      localStorage.setItem(this.persistKey, b64);
    }catch(e){ console.warn('persist sql.js failed', e); }
  }

  // -----------------
  // Utility helpers
  // -----------------
  static _randomId(){
    // simple uuidv4-ish
    return 'g_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }

  static _float32ToBase64(f32){
    const u8 = GestureVectorStore._float32ToUint8(f32);
    return GestureVectorStore._uint8ToBase64(u8);
  }
  static _base64ToFloat32(b64){
    const u8 = GestureVectorStore._base64ToUint8Arr(b64);
    return GestureVectorStore._uint8ToFloat32(u8);
  }
  static _float32ToUint8(f32){
    return new Uint8Array(f32.buffer.slice(0));
  }
  static _uint8ToFloat32(u8){
    // u8 may be Uint8Array or sql.js's internal object (which supports toString?)
    if (u8 instanceof Uint8Array) return new Float32Array(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
    // sql.js returns an object with values property or ArrayBuffer
    if (u8.buffer) return new Float32Array(u8.buffer);
    if (u8 instanceof ArrayBuffer) return new Float32Array(u8);
    // if it's string (base64) decode
    if (typeof u8 === 'string') return GestureVectorStore._base64ToFloat32(u8);
    // fallback: try to convert via Uint8Array
    try { const arr = new Uint8Array(u8); return new Float32Array(arr.buffer); } catch(e){ throw new Error('Unsupported vector blob type'); }
  }
  static _uint8ToBase64(u8){
    let binary = '';
    const len = u8.byteLength;
    for (let i=0;i<len;i++) binary += String.fromCharCode(u8[i]);
    return btoa(binary);
  }
  static _base64ToUint8Arr(b64){
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  static _base64ToUint8(b64){ return GestureVectorStore._base64ToUint8Arr(b64); }

  static _l2Normalize(farr){
    const x = (farr instanceof Float32Array) ? farr : new Float32Array(farr);
    let sum=0; for (let i=0;i<x.length;i++){ sum += x[i]*x[i]; }
    const norm = Math.sqrt(sum) || 1e-9;
    const out = new Float32Array(x.length);
    for (let i=0;i<x.length;i++) out[i] = x[i]/norm;
    return out;
  }

  static _dot(a,b){ let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
  static _cosineScore(a,b){
    // if both are l2-normalized, dot equals cosine
    return GestureVectorStore._dot(a,b) / ((a._norm || 1) * (b._norm || 1));
  }

  // -----------------
  // Migration helper
  // -----------------
  async migrateSqljsToIndexedDB(){
    if (this.backend !== 'sqljs') throw new Error('Not using sqljs');
    // export rows and import into IndexedDB
    const res = this.db.exec(`SELECT id,name,vector,metadata,created_at FROM ${this.storeName}`);
    if (!res || !res[0]) return 0;
    const rows = res[0].values;
    await this._initIndexedDB();
    let count = 0;
    for (const row of rows){
      const id = row[0], name = row[1], blob = row[2], metadata = row[3], created_at = row[4];
      const rec = {id,name,vector:GestureVectorStore._uint8ToBase64(blob),metadata,created_at};
      await new Promise((resolve,reject)=>{
        const tx = this.db.transaction([this.storeName],'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.add(rec);
        req.onsuccess = ()=>resolve(); req.onerror = e=>reject(e);
      });
      count++;
    }
    return count;
  }

  // Export encryption stub: user may plug real crypto
  static async exportEncrypted(jsonStr, password){
    // stub: return btoa(jsonStr) — replace with real encryption
    return btoa(jsonStr);
  }

}

// helper to detect MediaPipe hand21
function arrayIsHand21Like(a){
  if (!Array.isArray(a)) return false; if (a.length < 21) return false;
  const p = a[0]; return (p && (('x' in p && 'y' in p) || (Array.isArray(p))));
}

// -----------------
// Unit tests in comments
// -----------------
/*****
Unit test examples (to run in browser console or test harness):

// 1) Normalization invariance
const store = new GestureVectorStore();
(async()=>{
  await store.init();
  // base hand: 21 points on unit circle
  const base = []; for (let i=0;i<21;i++){ base.push({x: Math.cos(i), y: Math.sin(i), z:0}); }
  const s1 = await store.normalize(base);
  // translate
  const trans = base.map(p=>({x:p.x+100, y:p.y-50, z:0}));
  const s2 = await store.normalize(trans);
  // scale
  const scaled = base.map(p=>({x:p.x*3, y:p.y*3, z:0}));
  const s3 = await store.normalize(scaled);
  // rotate 45deg
  const a = Math.PI/4; const cos=Math.cos(a), sin=Math.sin(a);
  const rot = base.map(p=>({x:p.x*cos - p.y*sin, y:p.x*sin + p.y*cos, z:0}));
  const s4 = await store.normalize(rot);

  // compare distances
  const d = (A,B)=>{let s=0; for (let i=0;i<A.length;i++){ const v=A[i]-B[i]; s+=v*v; } return Math.sqrt(s); };
  console.assert(d(s1,s2) < 1e-6, 'translate invariant');
  console.assert(d(s1,s3) < 1e-6, 'scale invariant');
  console.assert(d(s1,s4) < 1e-5, 'rotation approx invariant');
})();

// 2) Query test
(async()=>{
  const store = new GestureVectorStore(); await store.init();
  const handA = []; for (let i=0;i<21;i++) handA.push({x:i,y:i*0.5,z:0});
  const handB = handA.map(p=>({x:p.x*1.2, y:p.y*1.2, z:0}));
  const id = await store.addGesture('testA', handA, {tag:'A'});
  const q = await store.query(handB, 3, 0.5);
  console.assert(q.length>0 && q[0].id===id, 'query matches');
})();
*****/

export default GestureVectorStore;
