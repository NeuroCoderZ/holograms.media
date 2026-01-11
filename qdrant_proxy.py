import http.server
import socketserver
import urllib.request
import urllib.error
import sys
import os

# ==========================================
# НАСТРОЙКИ
# ==========================================

# URL вашего кластера из Qdrant Cloud
REMOTE_QDRANT_URL = "https://08fd6826-0bb6-4c8e-92ee-98c15681253b.europe-west3-0.gcp.cloud.qdrant.io:6333" 

# Ваш API ключ
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.z8-SH2mf8jiywUsJgxq9Z3H_VBFlYMAyIcTZm7VfgL8"

# Порт, на котором будет работать этот прокси (должен совпадать с настройками Kilocode)
LOCAL_PORT = 6333

# ==========================================

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy_request("GET")

    def do_POST(self):
        self.proxy_request("POST")

    def do_PUT(self):
        self.proxy_request("PUT")

    def do_DELETE(self):
        self.proxy_request("DELETE")

    def proxy_request(self, method):
        target_url = f"{REMOTE_QDRANT_URL}{self.path}"
        
        # Убираем заголовки, которые могут конфликтовать
        headers = {key: value for key, value in self.headers.items() 
                  if key.lower() not in ['host', 'content-length']}
        
        # Добавляем авторизацию для облака
        headers['api-key'] = API_KEY
        
        # Получаем тело запроса
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        try:
            # print(f"[PROXY] {method} {self.path} -> {target_url}") # Раскомментируйте для отладки
            req = urllib.request.Request(target_url, data=body, headers=headers, method=method)
            
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                for key, value in response.headers.items():
                    self.send_header(key, value)
                self.end_headers()
                self.wfile.write(response.read())
                
        except urllib.error.HTTPError as e:
            print(f"[ERROR] {e} for {target_url}")
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            print(f"[CRITICAL] {e}")
            self.send_error(500, str(e))

if __name__ == "__main__":
    print(f"==================================================")
    print(f" Запуск Qdrant Proxy на порту {LOCAL_PORT}")
    print(f" Цель: {REMOTE_QDRANT_URL}")
    print(f"==================================================")
    
    # Разрешаем переиспользование порта
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", LOCAL_PORT), ProxyHandler) as httpd:
            print("Прокси запущен и готов к работе.")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:
            print(f"Ошибка: Порт {LOCAL_PORT} уже занят. Убедитесь, что локальный Qdrant остановлен.")
        else:
            raise
