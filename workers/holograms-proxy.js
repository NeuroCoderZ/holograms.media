// holograms-proxy — CF Worker: маршрутизация /api/* и /ws/* на Koyeb бэкенд.
// 2026-08-25 — закрывает карточки 1.6 (Koyeb IPv6-only -> ERR_TIMED_OUT),
// 1.3a и 1.7 (CF Pages не проксирует /ws/*, сигналинг мёртв).
// Воркеры ходят к Koyeb по IPv4 из сети Cloudflare — таймауты IPv6 исчезают.
// WebSocket поддерживается нативно (websockets: true в wrangler.toml).

const KOYEB_ORIGIN = 'https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Проксируем только /api/* и /ws/*; остальное — на статический Pages (не сюда)
    if (!path.startsWith('/api/') && !path.startsWith('/ws/')) {
      return new Response('holograms-proxy: pass-through disabled for ' + path, {
        status: 404,
        headers: { 'content-type': 'text/plain' },
      });
    }

    const targetUrl = KOYEB_ORIGIN + path + url.search;

    // --- WebSocket upgrade ---
    if (request.headers.get('Upgrade') === 'websocket') {
      const wsUrl = targetUrl;  // CF сам апгрейдит https:// c Upgrade:websocket
      try {
        return await proxyWebSocket(request, wsUrl);
      } catch (e) {
        return new Response('WS-PROXY DEBUG: ' + (e && e.message || String(e)), { status: 502 });
      }
    }

    // --- Обычный HTTP ---
    const proxied = new Request(targetUrl, request);
    // Host должен указывать на origin, иначе Koyeb вернёт 404
    proxied.headers.set('Host', new URL(KOYEB_ORIGIN).host);

    const resp = await fetch(proxied);
    // Клонируем ответ с CORS для веб-клиента
    const out = new Response(resp.body, resp);
    out.headers.set('Access-Control-Allow-Origin', '*');
    out.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    out.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return out;
  },
};

// Туннелирование WebSocket: клиент <-> воркер <-> Koyeb (два "пинг-понга")
async function proxyWebSocket(clientReq, targetUrl) {
  // 1. Принимаем WS от клиента (сторона Cloudflare)
  const acceptHeader = clientReq.headers.get('Sec-WebSocket-Key');
  const clientPair = new WebSocketPair();
  // 2. Открываем WS к Koyeb
  const upstreamResp = await fetch(targetUrl, {
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Key': acceptHeader,
      'Sec-WebSocket-Version': '13',
      // Пробрасываем субпротоколы, если клиент их просил
      ...(clientReq.headers.get('Sec-WebSocket-Protocol')
          ? { 'Sec-WebSocket-Protocol': clientReq.headers.get('Sec-WebSocket-Protocol') } : {}),
    },
  });

  if (!upstreamResp.webSocket) {
    // Апстрим не принял апгрейд — отдаём его ответ как есть
    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: upstreamResp.headers,
    });
  }

  // Принимаем обе стороны
  clientPair[1].accept();
  upstreamResp.webSocket.accept();

  // Пересылка в обе стороны
  upstreamResp.webSocket.addEventListener('message', (e) => {
    try { clientPair[1].send(e.data); } catch (_) {}
  });
  clientPair[1].addEventListener('message', (e) => {
    try { upstreamResp.webSocket.send(e.data); } catch (_) {}
  });
  const closeBoth = () => { try { clientPair[1].close(1000); } catch(_) {} try { upstreamResp.webSocket.close(1000); } catch(_) {} };
  upstreamResp.webSocket.addEventListener('close', closeBoth);
  clientPair[1].addEventListener('close', closeBoth);

  return new Response(null, { status: 101, webSocket: clientPair[0] });
}
