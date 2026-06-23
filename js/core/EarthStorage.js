import { eventBus } from './eventBus.js';
import { state } from './init.js';

const API_PREFIX = '/api/v1';
const WS_BASE = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

class EarthStorage {
    constructor() {
        this.earthId = null;
        this.ws = null;
        this.wsPromise = null;
        this.reconnectAttempts = 0;
        this.maxReconnect = 5;
        this.reconnectInterval = 3000;
        this.versionVector = new Map();
        this.pendingPatches = [];
        this.isSyncing = false;
        this.localNodes = new Map();
        this.listeners = new Map();
    }

    async init(earthId) {
        this.earthId = earthId || `earth:${state.auth?.currentUser?.uid || 'anon'}`;
        console.log(`[EarthStorage] Init for ${this.earthId}`);
        await this.connectWS();
        await this.fullSync();
        eventBus.emit('earth:ready', { earthId: this.earthId });
    }

    getAuthHeaders() {
        const token = state.auth?.currentUser?.stsTokenManager?.accessToken ||
                      localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async connectWS() {
        if (this.ws?.readyState === WebSocket.OPEN) return;
        if (this.wsPromise) return this.wsPromise;

        this.wsPromise = new Promise((resolve, reject) => {
            const token = state.auth?.currentUser?.stsTokenManager?.accessToken;
            if (!token) {
                reject(new Error('No auth token for WS'));
                return;
            }
            const url = `${WS_BASE}/ws/v1/earth/${encodeURIComponent(this.earthId)}?token=${token}`;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[EarthStorage] WS connected');
                this.reconnectAttempts = 0;
                this.wsPromise = null;
                this.requestSync();
                resolve();
            };

            this.ws.onmessage = (e) => this.handleWSMessage(e);

            this.ws.onclose = (e) => {
                console.log('[EarthStorage] WS closed:', e.code, e.reason);
                this.ws = null;
                this.wsPromise = null;
                if (e.code !== 1000 && this.reconnectAttempts < this.maxReconnect) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connectWS(), this.reconnectInterval);
                }
            };

            this.ws.onerror = (err) => {
                console.error('[EarthStorage] WS error:', err);
                if (this.wsPromise) {
                    this.wsPromise = null;
                    reject(err);
                }
            };
        });

        return this.wsPromise.catch(() => {});
    }

    handleWSMessage(event) {
        try {
            const msg = JSON.parse(event.data);
            const action = msg.action;

            switch (action) {
                case 'node_created':
                    this.applyRemoteNode(msg.node, 'created');
                    break;
                case 'node_updated':
                    this.applyRemoteNode(msg.node, 'updated');
                    break;
                case 'node_deleted':
                    this.removeLocalNode(msg.node_id);
                    break;
                case 'patches_applied':
                    this.confirmPatches(msg.patches, msg.by);
                    break;
                case 'sync_full':
                    this.applyFullSync(msg.nodes);
                    break;
                case 'pong':
                    break;
            }
        } catch (e) {
            console.error('[EarthStorage] WS parse error:', e);
        }
    }

    sendWS(action, data = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connectWS().then(() => this.sendWS(action, data));
            return;
        }
        this.ws.send(JSON.stringify({ action, ...data }));
    }

    requestSync() {
        this.sendWS('sync_request');
    }

    applyRemoteNode(nodeData, origin) {
        const id = nodeData.id;
        const remoteVersion = nodeData.version || 1;
        const localVersion = this.versionVector.get(id) || 0;

        if (remoteVersion > localVersion) {
            const prev = this.localNodes.get(id);
            this.localNodes.set(id, nodeData);
            this.versionVector.set(id, remoteVersion);
            this.emit('nodeChanged', { node: nodeData, origin, previous: prev });
        }
    }

    removeLocalNode(id) {
        if (this.localNodes.has(id)) {
            const prev = this.localNodes.get(id);
            this.localNodes.delete(id);
            this.versionVector.delete(id);
            this.emit('nodeDeleted', { nodeId: id, previous: prev });
        }
    }

    confirmPatches(patches, by) {
        this.pendingPatches = this.pendingPatches.filter(p => !patches.includes(p.id));
    }

    applyFullSync(nodes) {
        this.localNodes.clear();
        this.versionVector.clear();
        for (const n of nodes) {
            this.localNodes.set(n.id, n);
            this.versionVector.set(n.id, n.version || 1);
        }
        this.isSyncing = false;
        this.emit('synced', { count: nodes.length });
    }

    async restCall(method, path, body) {
        const res = await fetch(`${API_PREFIX}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Request failed');
        }
        return res.json();
    }

    async getScene() {
        return this.restCall('GET', `/earth/${encodeURIComponent(this.earthId)}/scene`);
    }

    async listNodes(skip = 0, limit = 200) {
        return this.restCall('GET', `/earth/${encodeURIComponent(this.earthId)}/nodes?skip=${skip}&limit=${limit}`);
    }

    async getNode(nodeId) {
        return this.restCall('GET', `/earth/${encodeURIComponent(this.earthId)}/nodes/${encodeURIComponent(nodeId)}`);
    }

    async createNode(nodeData) {
        return this.restCall('POST', `/earth/${encodeURIComponent(this.earthId)}/nodes`, nodeData);
    }

    async updateNode(nodeId, update) {
        return this.restCall('PATCH', `/earth/${encodeURIComponent(this.earthId)}/nodes/${encodeURIComponent(nodeId)}`, update);
    }

    async deleteNode(nodeId) {
        return this.restCall('DELETE', `/earth/${encodeURIComponent(this.earthId)}/nodes/${encodeURIComponent(nodeId)}`);
    }

    async shareNodes(nodeIds, targetEarth) {
        return this.restCall('POST', `/earth/${encodeURIComponent(this.earthId)}/share`, {
            target_earth_id: targetEarth,
            node_ids: nodeIds
        });
    }

    async listShared() {
        return this.restCall('GET', `/earth/${encodeURIComponent(this.earthId)}/shared`);
    }

    async importShared(nodeIds) {
        return this.restCall('POST', `/earth/${encodeURIComponent(this.earthId)}/import`, { node_ids: nodeIds });
    }

    on(event, cb) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(cb);
    }

    off(event, cb) {
        if (!this.listeners.has(event)) return;
        this.listeners.set(event, this.listeners.get(event).filter(l => l !== cb));
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'client disconnect');
            this.ws = null;
        }
    }
}

export const earthStorage = new EarthStorage();
export default earthStorage;