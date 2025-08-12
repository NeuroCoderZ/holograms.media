#!/usr/bin/env python3
"""
fill_missing_embeddings_fast.py
—————————————
Дозаписывает ПУСТЫЕ (!) эмбеддинги в «holographic_memory_v1.json»
быстро и безопасно:

• работает с JSON-МAССИВОМ (а не с {"chunks": [...]})
• шлёт тексты БАТЧАМИ (max-96) → 20–30× меньше HTTP-запросов
• пишет файл RARELY  (по умолчанию ‑ каждые 1 000 успешных записей)
• умеет RESUME — перезапуск продолжит c места остановки
• ротация N API-ключей при ошибке 429 / quota
• 3072-мерные эмбеддинги gemini-embedding-001
"""

import json, os, time, logging, sys, signal
from typing import List
from datetime import datetime
import google.generativeai as genai

# ----------------------------  ПАРАМЕТРЫ  -------------------------------- #
JSON_PATH          = "holographic_memory_v1.json"
API_KEYS_PATH      = "api_keys.txt"
MODEL_NAME         = "gemini-embedding-001"
VEC_DIM            = 3072
BATCH_SIZE         = 96          # максимум v1 API
SAVE_EVERY_N_VEC   = 1_000       # реже = быстрее
RETRY_MAX          = 3
RETRY_DELAY        = 1.0         # начальная пауза
# ------------------------------------------------------------------------- #

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.INFO,
    handlers=[logging.FileHandler("fill_embeddings_fast.log"),
              logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("emb_filler")

# graceful Ctrl-C
stop_flag = False
def _sigint_handler(sig, frame):
    global stop_flag
    stop_flag = True
    log.warning("↩️  Прерывание… скрипт завершит текущий батч и сохранит файл.")
signal.signal(signal.SIGINT, _sigint_handler)


def load_api_keys() -> List[str]:
    if os.path.exists(API_KEYS_PATH):
        with open(API_KEYS_PATH, encoding="utf-8") as f:
            keys = [k.strip() for k in f if k.strip()]
    else:
        env = os.getenv("GEMINI_API_KEY", "")
        keys = [env] if env else []
    if not keys:
        raise RuntimeError("🚫 Нет API-ключей в api_keys.txt или $GEMINI_API_KEY")
    log.info("🔑 Ключей загружено: %d", len(keys))
    return keys


class GeminiEmbedder:
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.idx  = 0
        genai.configure(api_key=self.keys[self.idx])

    def rotate(self) -> bool:
        if len(self.keys) == 1:
            return False
        self.idx = (self.idx + 1) % len(self.keys)
        genai.configure(api_key=self.keys[self.idx])
        log.warning("🔄 Переключился на ключ #%d", self.idx+1)
        return True

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        for attempt in range(RETRY_MAX):
            try:
                resp = genai.embed_content(
                    model=MODEL_NAME,
                    content=texts,
                    task_type="retrieval_document"
                )
                # API v1: для batch приходит {'embeddings':[...]}
                vecs = (resp["embeddings"]
                        if "embeddings" in resp      # batch
                        else [resp["embedding"]])    # single
                return [v["values"] if isinstance(v, dict) else v for v in vecs]

            except Exception as e:
                msg = str(e).lower()
                if "quota" in msg or "429" in msg or "limit" in msg:
                    if self.rotate():
                        continue
                if attempt < RETRY_MAX-1:
                    delay = RETRY_DELAY * 2**attempt
                    log.warning("⏳ retry in %.1fs (%s)", delay, e)
                    time.sleep(delay)
                else:
                    raise
        raise RuntimeError("Не удалось получить эмбеддинги")


def load_json_array(path: str) -> List[dict]:
    log.info("📥 Чтение %s …", path)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json_array(path: str, data: List[dict]):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)
    log.info("💾 Файл сохранён (%s)", path)


def main():
    data = load_json_array(JSON_PATH)
    missing_ids = [i for i, rec in enumerate(data)
                   if not rec.get("embedding")]

    if not missing_ids:
        log.info("✅ Эмбеддинги уже заполнены")
        return

    log.info("🚀 К дозаписи: %d записей из %d", len(missing_ids), len(data))
    embedder = GeminiEmbedder(load_api_keys())

    processed, since_save = 0, 0
    start_time = time.time()

    # обрабатываем ID партиями BATCH_SIZE
    for batch_start in range(0, len(missing_ids), BATCH_SIZE):
        if stop_flag:
            break
        batch_ids = missing_ids[batch_start:batch_start+BATCH_SIZE]
        texts     = [data[i]["text"] or "" for i in batch_ids]

        vectors = embedder.embed_batch(texts)
        for rec_id, vec in zip(batch_ids, vectors):
            data[rec_id]["embedding"] = vec
            data[rec_id]["timestamp"] = datetime.utcnow().isoformat()

        processed   += len(batch_ids)
        since_save  += len(batch_ids)

        log.info("✅ %d / %d (+%d) записей", processed, len(missing_ids), len(batch_ids))

        if since_save >= SAVE_EVERY_N_VEC:
            save_json_array(JSON_PATH, data)
            since_save = 0

    # финальный flush
    save_json_array(JSON_PATH, data)
    dur = time.time() - start_time
    log.info("🎉 Готово! Заполнено %d эмбеддингов за %.1f мин.",
             processed, dur/60)


if __name__ == "__main__":
    main()
