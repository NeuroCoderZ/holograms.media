# Отчёт в поддержку Cloudflare: зона holograms.media не обслуживается

2026-10-02 — отчёт подготовлен по данным инструментальных проверок из российского сегмента сети (Московская область, провайдер Yota). Все коды приведены как получены, без интерпретаций.

---

## 1. ИТОГ В ОДНОЙ СТРОКЕ

Зона `holograms.media` в аккаунте `66d386272db6de7ae50ee827505f5d93` обслуживает Apex-домен редиректом в несуществующий хост, subdomain-хосты отдают 530 и 000, а встроенные скрипты Cloudflare (`/cdn-cgi/`) не загружаются по таймауту. При этом API Cloudflare из этой же сети доступен.

---

## 2. ЧТО РАБОТАЕТ (доступно из РФ)

| Проверка | Результат |
|---|---|
| `cloudflared tunnel list` (CLI 4.146.0) | **работает**, возвращает 4 туннеля аккаунта |
| `api.cloudflare.com/client/v4` | **HTTP 404** — API доступен, ответ валидный |
| `dash.cloudflare.com` | HTTP 403 — доступен, стена авторизации |
| `pages.cloudflare.com` | HTTP 301 — доступен |
| `workers.cloudflare.com` | HTTP 301 — доступен |
| DNS-резолв `holograms.media` | 172.67.197.96, 104.21.84.217 — резолвится |

Туннели в аккаунте по данным `cloudflared tunnel list`:

| ID | Имя | Создан |
|---|---|---|
| 6cf47547-43a9-4ac3-893b-5fc3d92c8b4b | google-proxy | 2025-07-27 |
| 7aceea41-46f0-4e5e-b071-86bdb751a7a9 | olgaherz-live | 2026-09-21 |
| 9b40cc3e-1e69-43a9-811b-48f3b453159c | olgaherz-tunnel | 2026-06-17 |
| 1c2bde8d-2be7-4c68-a2a8-67178f94b4c8 | sicher-relay | 2026-05-18 |

---

## 3. ЧТО НЕ РАБОТАЕТ

### 3.1. Apex-домен отдаёт редирект в пустоту — ГЛАВНАЯ ПРОБЛЕМА

```
GET https://holograms.media

HTTP/2 301
location: https://www.holograms.media/$1
server: cloudflare
cf-ray: a43fd3308e49d346-FRA
```

**Дефект А: в `Location` стоит литерал `$1`.** В корректно настроенном динамическом (wildcard) правиле редиректа переменная `$1` подставляет фактический путь запроса, а не остаётся символом. Здесь она не раскрыта.

**Дефект Б: для `www.holograms.media` нет DNS-записи.**
```
GET https://www.holograms.media
curl: (6) Could not resolve host: www.holograms.media
```
Следовательно, любой запрос к apex перенаправляется в несуществующий хост. Ранее это работало — предположительно, запись `www` была удалена, либо правило перестало раскрывать `$1`.

### 3.2. Subdomain-хосты

| Хост | DNS | HTTP |
|---|---|---|
| `api.holograms.media` | есть | **530** |
| `tma.holograms.media` | есть | **530** |
| `video.holograms.media` | есть | **530** |
| `herz.holograms.media` | есть | **000** (обрыв) |
| `dev.holograms.media` | есть | **000** (см. 3.3) |
| `neuroescrow.holograms.media` | есть | **000** (обрыв) |
| `www.holograms.media` | **НЕТ записи** | недоступен |

**530** — стандартная ошибка Cloudflare Tunnel «туннель не подключён» (1033). Обрабатываемый `olgaherz-live` обслуживает в своей конфигурации `tma` и `herz`; `video` описан в конфигурации другого туннеля (`sicher-relay`), который не запущен.

### 3.3. `dev.holograms.media`: HTML отдаётся, все подресурсы таймаутятся

Консоль браузера (F12), консольная сеть:

```
email-decode.min.js:1    Failed to load resource: net::ERR_TIMED_OUT
manifest.json:1          Failed to load resource: net::ERR_TIMED_OUT
rocket-loader.min.js:1   Failed to load resource: net::ERR_TIMED_OUT
main.js:1                Failed to load resource: net::ERR_TIMED_OUT
speculation:1            Load failed (net::ERR_TIMED_OUT) for rule set
                         requested from
                         "https://dev.holograms.media/cdn-cgi/speculation"
(index):1                Load failed or canceled (net::ERR_TIMED_OUT)
```

**Это ключевой признак: не грузятся в том числе собственные скрипты Cloudflare** — `rocket-loader.min.js`, `email-decode.min.js` и rule set `/cdn-cgi/speculation`. То есть запрос проходит Cloudflare (иначе не было бы попытки загрузить `/cdn-cgi/`), но до вложений и до origin соединение не доходит.

Запрошенные URL этих ресурсов обслуживаются Worker `holograms-proxy` (`workers/wrangler.toml`, `name = "holograms-proxy"`, `compatibility_date = 2026-02-23`), у которого объявлены маршруты:

```toml
[[routes]]
pattern = "dev.holograms.media/api/*"
zone_name = "holograms.media"

[[routes]]
pattern = "dev.holograms.media/ws/*"
zone_name = "holograms.media"
```

### 3.4. Внешние платформы проекта из РФ

| Адрес | HTTP |
|---|---|
| `holograms-media-prod-holograms-media-6a8cc743.koyeb.app` | 000 |
| `holograms-media-dev-holograms-media-cb8383e3.koyeb.app` | 000 |
| `hermes.neuroescrow.workers.dev` | 000 |
| `neuroescrow-hermes.neurocoderz.workers.dev` | 000 |
| Cloudflare через mihomo :7890 | TLS: `unexpected eof while reading` |

---

## 4. ВОПРОСЫ К ПОДДЕРЖКЕ

1. Почему `location` в редиректе содержит нераскрытый литерал `$1`? Требуется проверка правила редиректа в зоне `holograms.media` и его типа (статическое правило вместо wildcard).
2. Какая должна быть настроена запись для `www.holograms.media`, чтобы редирект с apex перестал уводить в несуществующий хост? Достаточно A-записи на те же IP, или нужен CNAME на apex-запись?
3. Что означает одновременная картина «HTML получен, все вложения таймаутятся, включая `/cdn-cgi/*`» при живом API Cloudflare в той же сети? Просим проверить состояние origin и правил маршрутизации зоны.
4. `api`, `tma`, `video` отдают 530 при живом туннеле `olgaherz-live` (7aceea41). Просим подтвердить, на какие туннели фактически указывают CNAME-записи этих хостов в панели.
5. Подтверждается ли, что `*.workers.dev` недоступен из российского сегмента сети, или текущая недоступность имеет иную причину?

---

## 5. ЧТО УЖЕ ПРОВЕРЕНО И ИСКЛЮЧЕНО

- Клиент не использует VPN для этих проверок, все запросы идут напрямую (`--noproxy '*'`).
- `curl` и браузер ведут себя одинаково.
- API Cloudflare из той же точки доступен, значит проблема не в полной блокировке аккаунта.
- Локальный туннель `olgaherz-live` запущен процессом `cloudflared tunnel ... run` и слушает `127.0.0.1:8095`; наружу отдаются только порты origin, доступа к машине клиента это не даёт.