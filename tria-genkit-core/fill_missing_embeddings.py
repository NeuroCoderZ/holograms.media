#!/usr/bin/env python3
"""
fill_missing_embeddings_free.py
Заполнение недостающих эмбеддингов 3072-D моделью
gemini-embedding-001 в рамках бесплатного тира
(≤15 RPM, ≤1500 RPD).

© Holographic Media, 2025-07
"""

import os, sys, json, time, logging, signal
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
import google.generativeai as genai

# ---------------- ПАРАМЕТРЫ, адаптируйте при необходимости ---------------- #
JSON_PATH        = Path("holographic_memory_v1.json")
API_KEYS_FILE    = Path("api_keys.txt")
MODEL_NAME       = "models/gemini-embedding-001"
EMB_DIM          = 3072
BATCH_SIZE       = 100          # максимум для embed_content
SAVE_EVERY_BATCH = 15           # сохранять файл каждые N батчей
RPM_LIMIT        = 15           # free tier: 15 запросов/мин[150]
RPD_LIMIT        = 1500         # free tier: 1 500 запросов/сутки[150]
# -------------------------------------------------------------------------- #

# --- ЛОГИ ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[logging.FileHandler("fill_embeddings.log"),
              logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("emb_free")

# --- Обработка Ctrl-C ---
_stop = False
signal.signal(signal.SIGINT, lambda *_: (setattr(sys.modules[__name__], "_stop", True),
                                         log.warning("⏹️  Получен Ctrl-C, останавливаемся корректно…")))

# ------------------ ВСПОМОГАТЕЛЬНЫЕ КЛАССЫ ------------------ #
class RateLimiter:
    """Управляет лимитами 15 RPM и 1500 RPD для бесплатного тира."""
    def __init__(self):
        self.minute_start = time.time()
        self.day_start    = datetime.utcnow().date()
        self.req_minute   = 0
        self.req_day      = 0

    def wait(self):
        # суточное окно
        if datetime.utcnow().date() != self.day_start:
            self.day_start  = datetime.utcnow().date()
            self.req_day    = 0
        if self.req_day >= RPD_LIMIT:
            until = datetime.combine(self.day_start + timedelta(days=1),
                                     datetime.min.time())
            sleep = (until - datetime.utcnow()).total_seconds()
            log.info("🌙 Суточная квота исчерпана (%d). Спим %.1f ч",
                     self.req_day, sleep / 3600)
            time.sleep(sleep)
            self.day_start = datetime.utcnow().date()
            self.req_day = 0

        # минутное окно
        now = time.time()
        if now - self.minute_start >= 60:
            self.minute_start = now
            self.req_minute   = 0
        if self.req_minute >= RPM_LIMIT:
            sleep = 60 - (now - self.minute_start)
            log.debug("⏳ Достигнут RPM-лимит, спим %.1f с", sleep)
            time.sleep(sleep)
            self.minute_start = time.time()
            self.req_minute   = 0

    def record(self):
        self.req_minute += 1
        self.req_day    += 1

def load_keys() -> List[str]:
    if not API_KEYS_FILE.exists():
        sys.exit("Нет api_keys.txt")
    keys = [k.strip() for k in API_KEYS_FILE.read_text().splitlines() if k.strip()]
    if not keys:
        sys.exit("api_keys.txt пуст")
    return keys

def valid(vec) -> bool:
    return isinstance(vec, list) and len(vec) == EMB_DIM and any(abs(x) > 1e-12 for x in vec)

# ----------------------- ОСНОВНАЯ ЛОГИКА ----------------------- #
def main():
    # API-ключи
    keys = load_keys()
    key_idx = 0
    genai.configure(api_key=keys[key_idx])
    log.info("🔑 Ключ #%d активирован", key_idx + 1)

    # JSON
    if not JSON_PATH.exists():
        sys.exit(f"Файл {JSON_PATH} не найден")
    data = json.loads(JSON_PATH.read_text())
    if not isinstance(data, list):
        sys.exit("Ожидался JSON-массив")

    # список индексов с пустыми/битами эмбеддингами
    targets = [i for i, rec in enumerate(data) if not valid(rec.get("embedding"))]
    if not targets:
        log.info("✅ Всё заполнено")
        return
    log.info("🎯 К обработке: %d записей", len(targets))

    rl = RateLimiter()
    processed, batch_counter = 0, 0

    for start in range(0, len(targets), BATCH_SIZE):
        if _stop:
            break
        batch_ids = targets[start:start+BATCH_SIZE]
        texts = [data[i]["text"] or "" for i in batch_ids]

        # лимиты
        rl.wait()

        # запрос
        try:
            resp = genai.embed_content(model=MODEL_NAME,
                                       content=texts,
                                       task_type="retrieval_document")
            rl.record()
        except Exception as e:
            msg = str(e).lower()
            log.warning("⚠️  Ошибка API: %s", msg)
            # если quota → переключаем ключ
            if "quota" in msg or "429" in msg:
                key_idx = (key_idx + 1) % len(keys)
                genai.configure(api_key=keys[key_idx])
                log.warning("🔄 Переход на ключ #%d", key_idx + 1)
                continue
            time.sleep(10)
            continue

        # разбор результата
        vecs = resp.get("embeddings") or [resp.get("embedding")]
        if len(vecs) != len(batch_ids):
            log.error("Размер ответа ≠ запросу, пропускаю батч")
            continue

        for rec_id, emb in zip(batch_ids, vecs):
            data[rec_id]["embedding"] = emb["values"] if isinstance(emb, dict) else emb
            data[rec_id]["timestamp"] = datetime.utcnow().isoformat()

        processed += len(batch_ids)
        batch_counter += 1
        log.info("✅ %d / %d (+%d)", processed, len(targets), len(batch_ids))

        # периодическое сохранение
        if batch_counter >= SAVE_EVERY_BATCH:
            tmp = JSON_PATH.with_suffix(".tmp")
            backup = JSON_PATH.with_suffix(".backup")
            JSON_PATH.replace(backup)  # бэкап
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            tmp.replace(JSON_PATH)
            backup.unlink(missing_ok=True)
            log.info("💾 Сохранено, бэкап удалён")
            batch_counter = 0

    # финальное сохранение
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    log.info("🏁 Завершено. Добавлено эмбеддингов: %d", processed)

if __name__ == "__main__":
    main()
