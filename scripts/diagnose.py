"""
scripts/diagnose.py

Комплексная диагностика окружения деплоя:
1. Gemini Embedding API — smoke test (один эмбеддинг, таймаут 20с)
2. AstraDB — ping + count коллекции
3. Версии — синхронизация version.txt / package.json / index.html
4. Deploy regex — проверка что regex не создаёт дублей

Запуск: python scripts/diagnose.py
"""

import os
import sys
import time
import re
import asyncio
import json
from pathlib import Path

# Загрузка .env
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

API_TIMEOUT = 20  # секунд


async def test_gemini_api():
    """Smoke test: один эмбеддинг за <20 секунд."""
    print("[1/4] Gemini Embedding API...")
    try:
        from google import genai
        from google.genai import types
        import httpx

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("  ✗ GOOGLE_API_KEY не задан")
            return False

        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=API_TIMEOUT),
        )

        start = time.time()
        response = await asyncio.to_thread(
            client.models.embed_content,
            model="gemini-embedding-2-preview",
            contents="Hello Holograms",
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=3072,
            ),
        )
        elapsed = time.time() - start

        dims = len(response.embeddings[0].values) if response.embeddings else 0
        print(f"  ✓ API OK — {elapsed:.1f}с, {dims} dims")
        return True

    except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as e:
        print(f"  ✗ NETWORK ERROR: {type(e).__name__}: {e}")
        return False
    except Exception as e:
        print(f"  ✗ API ERROR: {type(e).__name__}: {e}")
        return False


async def test_astradb():
    """Ping AstraDB + count документов в коллекции."""
    print("[2/4] AstraDB...")
    try:
        from astrapy import DataAPIClient

        token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
        endpoint = os.getenv("ASTRA_DB_API_ENDPOINT") or os.getenv("ASTRA_DATABASE_URL")
        keyspace = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")

        if not token or not endpoint:
            print("  ✗ AstraDB credentials не заданы")
            return False

        client = DataAPIClient(token)
        db = client.get_async_database(endpoint, keyspace=keyspace)
        collection = db.get_collection("tria_knowledge_gemini")

        count = await collection.count_documents({}, upper_bound=100000)
        print(f"  ✓ DB OK — коллекция tria_knowledge_gemini, {count} документов")
        return True

    except Exception as e:
        print(f"  ✗ DB ERROR: {type(e).__name__}: {e}")
        return False


def test_version_sync():
    """Проверка синхронизации версий."""
    print("[3/4] Версии...")
    root = Path(__file__).parent.parent

    vt = (root / "version.txt").read_text().strip()

    pkg = json.loads((root / "package.json").read_text())
    pv = pkg.get("version", "N/A")

    html = (root / "index.html").read_text()
    m = re.search(r"DEPLOY VERSION: (\d+\.\d+\.\d+)", html)
    hv = m.group(1) if m else "NOT FOUND"

    ok = vt == pv == hv
    status = "✓ OK" if ok else "✗ MISMATCH"
    print(f"  {status} — version.txt={vt} package.json={pv} index.html={hv}")

    # Проверка что нет дублей
    all_matches = re.findall(r"DEPLOY VERSION: \d+\.\d+\.\d+", html)
    if len(all_matches) > 1:
        print(f"  ✗ ДУБЛИ в index.html: {all_matches}")
        return False

    return ok


def test_deploy_regex():
    """Dry run regex: симуляция инкремента версии."""
    print("[4/4] Deploy regex...")
    root = Path(__file__).parent.parent

    vt = (root / "version.txt").read_text().strip()
    parts = vt.split(".")
    parts[2] = str(int(parts[2]) + 1)
    new_version = ".".join(parts)

    html = (root / "index.html").read_text()
    regex = re.compile(r'console\.log\("DEPLOY VERSION: \d+\.\d+\.\d+"')
    replacement = f'console.log("DEPLOY VERSION: {new_version}"'

    new_html = re.sub(regex, replacement, html)

    # Проверка что версия обновилась и нет дублей
    matches = re.findall(r"DEPLOY VERSION: \d+\.\d+\.\d+", new_html)
    if len(matches) == 1 and matches[0] == f"DEPLOY VERSION: {new_version}":
        print(f"  ✓ Regex OK — {vt} → {new_version}, дублей нет")
        return True
    else:
        print(f"  ✗ Regex FAIL — найдено: {matches}")
        return False


async def main():
    print("=" * 50)
    print("  HOLOGRAMS MEDIA — Deploy Diagnostics")
    print("=" * 50)
    print()

    results = []
    results.append(("Gemini API", await test_gemini_api()))
    results.append(("AstraDB", await test_astradb()))
    results.append(("Versions", test_version_sync()))
    results.append(("Deploy Regex", test_deploy_regex()))

    print()
    print("=" * 50)
    all_ok = all(ok for _, ok in results)
    if all_ok:
        print("  ✓ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ — можно запускать deploy")
    else:
        print("  ✗ ЕСТЬ ОШИБКИ — deploy не рекомендуется")
        for name, ok in results:
            if not ok:
                print(f"    - {name}")
    print("=" * 50)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    asyncio.run(main())
