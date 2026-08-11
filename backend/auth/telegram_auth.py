# backend/auth/telegram_auth.py
"""Валидация Telegram Mini Apps initData.

Реализованы ОБА официальных пути (core.telegram.org/bots/webapps):

1. HMAC-SHA256 (владелец бота):
   secret_key      = HMAC_SHA256(<bot_token>, "WebAppData")
   expected_hash   = HMAC_SHA256(data_check_string, secret_key)
   data_check_string = поля кроме hash/signature, отсортированные, "key=<value>", \n

2. Ed25519 (third-party, без доступа к bot_token) — параметр `signature`:
   data_check_string = "<bot_id>:WebAppData\n" + отсортированные поля
                       (кроме hash и signature)
   Проверка публичным ключом Telegram (base64url без паддинга).

Дополнительно: обязательная проверка свежести auth_date (защита от replay).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any, Dict, Optional
from urllib.parse import parse_qsl

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

logger = logging.getLogger(__name__)

# Официальные Ed25519 public keys Telegram (hex), core.telegram.org/bots/webapps
TELEGRAM_ED25519_PUBLIC_KEY_PROD = (
    "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d"
)
TELEGRAM_ED25519_PUBLIC_KEY_TEST = (
    "40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec"
)

# Максимальный возраст initData. Дока разрешает до 24 ч, но чем короче — тем лучше.
DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60

# Поля, исключаемые из data_check_string по спецификации
_EXCLUDED_FIELDS = frozenset({"hash", "signature"})


class TelegramAuthError(Exception):
    """Ошибка валидации initData. Текст безопасен для логов (без секретов)."""


def _build_data_check_string(
    fields: Dict[str, str], prefix: Optional[str] = None
) -> str:
    """Собирает data_check_string: поля кроме hash/signature, отсортированы по ключу."""
    pairs = [
        f"{key}={value}"
        for key, value in sorted(fields.items())
        if key not in _EXCLUDED_FIELDS
    ]
    if prefix is not None:
        pairs.insert(0, prefix)
    return "\n".join(pairs)


def _check_auth_date(fields: Dict[str, str], max_age_seconds: int) -> int:
    """Проверяет свежесть auth_date. Возвращает timestamp."""
    raw = fields.get("auth_date")
    if not raw:
        raise TelegramAuthError("auth_date missing")
    try:
        auth_date = int(raw)
    except (TypeError, ValueError) as exc:
        raise TelegramAuthError("auth_date is not an integer") from exc

    age = int(time.time()) - auth_date
    if age > max_age_seconds:
        raise TelegramAuthError(f"initData expired (age {age}s > {max_age_seconds}s)")
    # Небольшой допуск на расхождение часов клиента/сервера
    if age < -300:
        raise TelegramAuthError("auth_date is in the future")
    return auth_date


def _parse_init_data(init_data: str) -> Dict[str, str]:
    if not init_data or not isinstance(init_data, str):
        raise TelegramAuthError("initData is empty")
    # keep_blank_values: пустые опциональные поля участвуют в подписи
    fields = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=False))
    if not fields:
        raise TelegramAuthError("initData is not a valid query string")
    return fields


def validate_init_data_hmac(
    init_data: str,
    bot_token: str,
    max_age_seconds: int = DEFAULT_MAX_AGE_SECONDS,
) -> Dict[str, Any]:
    """Путь 1: владелец бота. HMAC-SHA256 с secret_key = HMAC(bot_token, "WebAppData")."""
    if not bot_token:
        raise TelegramAuthError("bot_token is not configured")

    fields = _parse_init_data(init_data)
    received_hash = fields.get("hash")
    if not received_hash:
        raise TelegramAuthError("hash missing in initData")

    data_check_string = _build_data_check_string(fields)
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise TelegramAuthError("hash mismatch: initData is not authentic")

    _check_auth_date(fields, max_age_seconds)
    return _decode_payload(fields)


def validate_init_data_ed25519(
    init_data: str,
    bot_id: int | str,
    max_age_seconds: int = DEFAULT_MAX_AGE_SECONDS,
    use_test_env: bool = False,
) -> Dict[str, Any]:
    """Путь 2: third-party. Ed25519-подпись поля `signature`, bot_token не нужен."""
    fields = _parse_init_data(init_data)
    signature_b64 = fields.get("signature")
    if not signature_b64:
        raise TelegramAuthError("signature missing in initData")

    data_check_string = _build_data_check_string(
        fields, prefix=f"{bot_id}:WebAppData"
    )

    # base64url без паддинга — добавляем его перед декодом
    padding = "=" * (-len(signature_b64) % 4)
    try:
        signature = base64.urlsafe_b64decode(signature_b64 + padding)
    except (ValueError, TypeError) as exc:
        raise TelegramAuthError("signature is not valid base64url") from exc

    key_hex = (
        TELEGRAM_ED25519_PUBLIC_KEY_TEST
        if use_test_env
        else TELEGRAM_ED25519_PUBLIC_KEY_PROD
    )
    public_key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(key_hex))

    try:
        public_key.verify(signature, data_check_string.encode("utf-8"))
    except InvalidSignature as exc:
        raise TelegramAuthError("Ed25519 signature verification failed") from exc

    _check_auth_date(fields, max_age_seconds)
    return _decode_payload(fields)


def _decode_payload(fields: Dict[str, str]) -> Dict[str, Any]:
    """Разбирает валидированные поля. photo_url НЕ возвращаем (юридический трек L1)."""
    payload: Dict[str, Any] = {
        key: value for key, value in fields.items() if key not in _EXCLUDED_FIELDS
    }

    raw_user = fields.get("user")
    if raw_user:
        try:
            user = json.loads(raw_user)
        except json.JSONDecodeError as exc:
            raise TelegramAuthError("user field is not valid JSON") from exc

        # Минимизация данных: только то, что реально нужно для сессии.
        # photo_url сознательно отбрасывается (риск биометрии, GDPR-минимизация).
        payload["user"] = {
            "id": user.get("id"),
            "first_name": user.get("first_name"),
            "username": user.get("username"),
            "language_code": user.get("language_code"),
        }
        if not payload["user"]["id"]:
            raise TelegramAuthError("user.id missing")

    payload["auth_date"] = int(fields["auth_date"])
    return payload
