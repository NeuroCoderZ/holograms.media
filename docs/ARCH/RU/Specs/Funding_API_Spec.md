# Funding API Specification (Phase 6.5)

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Статус: Draft (требует review перед имплементацией)

---

## 🎯 Цель

Спецификация API для прозрачного финансирования проекта через:
- **Telegram Stars** (XTR) — нативные платежи в Telegram Mini App
- **TON** — криптовалютные донаты через TON Connect
- **Obolos Accrual** — начисление внутренней валюты за поддержку

---

## 📋 ENDPOINT: POST /api/v1/funding/donate

### Base URL
```
Production: https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app/api/v1/funding/donate
Development: http://localhost:8000/api/v1/funding/donate
```

### Authentication
**Dual Auth:**
1. **JWT Token** (user session) — для идентификации пользователя
2. **Telegram WebApp initData** — для валидации платежа

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Telegram-Init-Data: <telegram_webapp_init_data>
```

### Request Payload

```json
{
  "amount": 100,
  "currency": "XTR",
  "purpose": "gas_boost",
  "tx_hash": "optional_for_ton",
  "init_data": "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397...",
  "idempotency_key": "uuid-v4-string"
}
```

**Поля:**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `amount` | integer | ✅ | Сумма доната (минимум: 1) |
| `currency` | string | ✅ | Валюта: `XTR` (Telegram Stars) или `TON` |
| `purpose` | string | ✅ | Цель: `gas_boost`, `feature_request`, `general_support` |
| `tx_hash` | string | ❌ | Хеш транзакции TON (обязателен для `currency: "TON"`) |
| `init_data` | string | ✅ | Telegram WebApp initData (для валидации) |
| `idempotency_key` | string | ✅ | UUID v4 для предотвращения дублей |

**Валидация:**
- `amount`: 1 ≤ amount ≤ 10000 (XTR), 0.1 ≤ amount ≤ 1000 (TON)
- `currency`: enum `["XTR", "TON"]`
- `purpose`: enum `["gas_boost", "feature_request", "general_support"]`
- `tx_hash`: regex `^[A-Za-z0-9]{44}$` (TON transaction hash format)
- `init_data`: валидация через Telegram Bot API
- `idempotency_key`: UUID v4 format

### Response (Success)

**HTTP 201 Created**
```json
{
  "status": "success",
  "donation_id": "don_1a2b3c4d5e6f",
  "amount": 100,
  "currency": "XTR",
  "purpose": "gas_boost",
  "obolos_accrued": 1000,
  "timestamp": "2026-05-13T12:15:30Z",
  "receipt_url": "https://holograms.media/receipts/don_1a2b3c4d5e6f"
}
```

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `status` | string | Статус операции: `success`, `pending`, `failed` |
| `donation_id` | string | Уникальный ID доната (префикс `don_`) |
| `amount` | integer | Подтверждённая сумма |
| `currency` | string | Валюта |
| `purpose` | string | Цель доната |
| `obolos_accrued` | integer | Начисленные Obolos (1 XTR = 10 Obolos, 1 TON = 100 Obolos) |
| `timestamp` | string | ISO 8601 timestamp |
| `receipt_url` | string | Ссылка на квитанцию (опционально) |

### Response (Error)

**HTTP 400 Bad Request**
```json
{
  "status": "error",
  "error_code": "INVALID_INIT_DATA",
  "message": "Telegram WebApp initData validation failed",
  "details": {
    "field": "init_data",
    "reason": "Signature mismatch"
  }
}
```

**Error Codes:**

| Код | HTTP | Описание |
|-----|------|----------|
| `INVALID_INIT_DATA` | 400 | Невалидный Telegram initData |
| `INVALID_AMOUNT` | 400 | Сумма вне допустимого диапазона |
| `INVALID_CURRENCY` | 400 | Неподдерживаемая валюта |
| `DUPLICATE_DONATION` | 409 | Дубликат (idempotency_key уже использован) |
| `TX_NOT_FOUND` | 404 | TON транзакция не найдена (для `currency: "TON"`) |
| `RATE_LIMIT_EXCEEDED` | 429 | Превышен лимит (5 req/min) |
| `UNAUTHORIZED` | 401 | Невалидный JWT token |
| `INTERNAL_ERROR` | 500 | Внутренняя ошибка сервера |

---

## 💾 STORAGE: AstraDB Collection `tria_funding_log`

### Schema

```json
{
  "_id": "don_1a2b3c4d5e6f",
  "user_id": "usr_abc123",
  "amount": 100,
  "currency": "XTR",
  "purpose": "gas_boost",
  "tx_hash": null,
  "obolos_accrued": 1000,
  "status": "completed",
  "timestamp": "2026-05-13T12:15:30Z",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "telegram_user_id": 279058397,
    "username": "@neurocoderz",
    "platform": "telegram_mini_app",
    "app_version": "0.20.492"
  }
}
```

**Индексы:**
- Primary: `_id`
- Secondary: `user_id`, `idempotency_key`, `timestamp`

**TTL:** Нет (permanent storage для финансовых записей)

---

## 🔒 SECURITY

### 1. Telegram WebApp initData Validation

**Алгоритм:**
```python
import hmac
import hashlib
from urllib.parse import parse_qs

def validate_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """
    Валидация Telegram WebApp initData согласно официальной документации.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    try:
        # Parse init_data
        parsed = parse_qs(init_data)
        hash_value = parsed.get('hash', [None])[0]
        
        if not hash_value:
            return False
        
        # Remove hash from data
        data_check_string = '\n'.join(
            f"{k}={v[0]}" for k, v in sorted(parsed.items()) if k != 'hash'
        )
        
        # Compute secret key
        secret_key = hmac.new(
            b"WebAppData",
            bot_token.encode(),
            hashlib.sha256
        ).digest()
        
        # Compute hash
        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_hash, hash_value)
    
    except Exception:
        return False
```

### 2. Rate Limiting

**Лимиты:**
- **Per User:** 5 requests / minute
- **Global:** 100 requests / minute

**Имплементация:**
```python
from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/funding/donate")
@limiter.limit("5/minute")
async def donate(request: Request, payload: DonationRequest):
    # ...
```

### 3. Idempotency

**Механизм:**
- Клиент генерирует UUID v4 для каждого запроса
- Сервер проверяет `idempotency_key` в AstraDB
- Если ключ существует → возвращает оригинальный ответ (HTTP 200)
- Если ключ новый → обрабатывает запрос (HTTP 201)

**TTL для idempotency keys:** 24 часа

### 4. TON Transaction Verification

**Для `currency: "TON"`:**
```python
import httpx

async def verify_ton_transaction(tx_hash: str, expected_amount: float) -> bool:
    """
    Верификация TON транзакции через TON API.
    """
    url = f"https://toncenter.com/api/v2/getTransactions?address={ESCROW_ADDRESS}&limit=10"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        transactions = response.json()['result']
        
        for tx in transactions:
            if tx['transaction_id']['hash'] == tx_hash:
                amount_nano = int(tx['in_msg']['value'])
                amount_ton = amount_nano / 1e9
                
                return abs(amount_ton - expected_amount) < 0.01  # Tolerance 0.01 TON
    
    return False
```

---

## 🎨 UX FLOW (Telegram Mini App)

### 1. Floating Button

**Позиция:** Правый нижний угол (fixed)

**HTML:**
```html
<button id="donate-button" class="floating-donate-btn">
  ⚡ Добавить газу
</button>
```

**CSS:**
```css
.floating-donate-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.2s;
}

.floating-donate-btn:hover {
  transform: scale(1.1);
}
```

### 2. Payment Sheet

**Telegram Stars (XTR):**
```javascript
// neuroescrow/js/telegram.js
async function openDonateSheet() {
  const amount = 100; // XTR
  const purpose = 'gas_boost';
  
  // Telegram Payment API
  const invoice = await Telegram.WebApp.openInvoice({
    title: 'Добавить газу',
    description: 'Поддержка проекта Holograms Media',
    payload: JSON.stringify({ purpose, amount }),
    provider_token: '', // Empty for Stars
    currency: 'XTR',
    prices: [{ label: 'Газ', amount: amount * 100 }] // Amount in cents
  });
  
  if (invoice.status === 'paid') {
    // Send to backend
    await fetch('/api/v1/funding/donate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt_token}`,
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': Telegram.WebApp.initData
      },
      body: JSON.stringify({
        amount,
        currency: 'XTR',
        purpose,
        init_data: Telegram.WebApp.initData,
        idempotency_key: crypto.randomUUID()
      })
    });
    
    // Show success toast
    Telegram.WebApp.showAlert('✅ Спасибо за поддержку! +1000 Obolos');
    Telegram.WebApp.HapticFeedback.notificationOccurred('success');
  }
}
```

**TON Connect (Fallback):**
```javascript
// neuroescrow/js/tonconnect.js
async function donateTON(amountTon) {
  const result = await tonConnect.sendPayment(
    ESCROW_ADDRESS,
    amountTon,
    `NeuroEscrow Donation: gas_boost`
  );
  
  if (result) {
    // Send to backend with tx_hash
    await fetch('/api/v1/funding/donate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountTon,
        currency: 'TON',
        purpose: 'gas_boost',
        tx_hash: result.boc, // Transaction hash
        init_data: Telegram.WebApp.initData,
        idempotency_key: crypto.randomUUID()
      })
    });
  }
}
```

### 3. Success Callback

**UI Toast:**
```javascript
function showDonationSuccess(obolos) {
  const toast = document.createElement('div');
  toast.className = 'donation-toast';
  toast.innerHTML = `
    <div class="toast-icon">✅</div>
    <div class="toast-text">
      <strong>Спасибо за поддержку!</strong>
      <p>+${obolos} Obolos начислено</p>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}
```

---

## 📊 OBOLOS ACCRUAL FORMULA

**Conversion Rates:**
- **1 XTR (Telegram Star)** = 10 Obolos
- **1 TON** = 100 Obolos

**Bonus Multipliers:**
- First donation: **×1.5**
- Monthly supporter (3+ donations): **×1.2**
- Large donation (≥100 XTR or ≥10 TON): **×1.3**

**Formula:**
```python
def calculate_obolos(amount: float, currency: str, user_stats: dict) -> int:
    # Base conversion
    if currency == "XTR":
        base_obolos = amount * 10
    elif currency == "TON":
        base_obolos = amount * 100
    else:
        return 0
    
    # Apply multipliers
    multiplier = 1.0
    
    if user_stats['donation_count'] == 0:
        multiplier *= 1.5  # First donation bonus
    
    if user_stats['monthly_donations'] >= 3:
        multiplier *= 1.2  # Monthly supporter
    
    if (currency == "XTR" and amount >= 100) or (currency == "TON" and amount >= 10):
        multiplier *= 1.3  # Large donation
    
    return int(base_obolos * multiplier)
```

---

## 📈 DASHBOARD ENDPOINT: GET /api/v1/funding/stats

### Response

```json
{
  "total_raised": {
    "XTR": 15000,
    "TON": 250.5,
    "USD_equivalent": 3500.0
  },
  "top_supporters": [
    {
      "username": "@neurocoderz",
      "total_obolos": 50000,
      "donation_count": 12
    }
  ],
  "recent_donations": [
    {
      "amount": 100,
      "currency": "XTR",
      "purpose": "gas_boost",
      "timestamp": "2026-05-13T12:15:30Z"
    }
  ],
  "monthly_goal": {
    "target_usd": 5000,
    "current_usd": 3500,
    "progress_percent": 70
  }
}
```

---

## 🧪 TESTING

### Unit Tests

```python
# tests/test_funding_api.py
import pytest
from fastapi.testclient import TestClient

def test_donate_xtr_success(client: TestClient):
    response = client.post("/api/v1/funding/donate", json={
        "amount": 100,
        "currency": "XTR",
        "purpose": "gas_boost",
        "init_data": "valid_init_data",
        "idempotency_key": "550e8400-e29b-41d4-a716-446655440000"
    }, headers={"Authorization": "Bearer valid_jwt"})
    
    assert response.status_code == 201
    assert response.json()["obolos_accrued"] == 1000

def test_donate_invalid_init_data(client: TestClient):
    response = client.post("/api/v1/funding/donate", json={
        "amount": 100,
        "currency": "XTR",
        "purpose": "gas_boost",
        "init_data": "invalid_init_data",
        "idempotency_key": "550e8400-e29b-41d4-a716-446655440001"
    }, headers={"Authorization": "Bearer valid_jwt"})
    
    assert response.status_code == 400
    assert response.json()["error_code"] == "INVALID_INIT_DATA"

def test_donate_idempotency(client: TestClient):
    key = "550e8400-e29b-41d4-a716-446655440002"
    
    # First request
    response1 = client.post("/api/v1/funding/donate", json={
        "amount": 100,
        "currency": "XTR",
        "purpose": "gas_boost",
        "init_data": "valid_init_data",
        "idempotency_key": key
    }, headers={"Authorization": "Bearer valid_jwt"})
    
    # Second request (duplicate)
    response2 = client.post("/api/v1/funding/donate", json={
        "amount": 100,
        "currency": "XTR",
        "purpose": "gas_boost",
        "init_data": "valid_init_data",
        "idempotency_key": key
    }, headers={"Authorization": "Bearer valid_jwt"})
    
    assert response1.status_code == 201
    assert response2.status_code == 200  # Returns cached response
    assert response1.json()["donation_id"] == response2.json()["donation_id"]
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Создать AstraDB коллекцию `tria_funding_log`
- [ ] Добавить `TELEGRAM_BOT_TOKEN` в `.env.production`
- [ ] Настроить Telegram Payment Provider (Stars)
- [ ] Добавить `ESCROW_ADDRESS` для TON (multi-sig wallet)
- [ ] Настроить rate limiting (Redis/Cloudflare)
- [ ] Добавить мониторинг (Sentry, Datadog)
- [ ] Создать dashboard `/funding` (Chart.js)
- [ ] Написать unit tests (coverage ≥80%)
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing (100 req/s)

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.493)  
**Статус:** Draft (требует review)
