# backend/tests/test_telegram_auth.py
"""Тесты валидации Telegram initData (L1-C).

Проверяют оба официальных пути (core.telegram.org/bots/webapps):
  * HMAC-SHA256 с secret_key = HMAC(bot_token, "WebAppData")
  * Ed25519-подпись поля `signature` для third-party

Подписи генерируются настоящей криптографией, а не подставляются константами:
тест валит подделку, а не сверяет строку со строкой.

Запуск: python3 backend/tests/test_telegram_auth.py
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sys
import time
from urllib.parse import urlencode

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey  # noqa: E402

from backend.auth import telegram_auth as ta  # noqa: E402

BOT_TOKEN = "123456:TEST-BOT-TOKEN-FOR-UNIT-TESTS"
BOT_ID = 123456

USER = {
    "id": 777000,
    "first_name": "Neuro",
    "username": "neurocoder",
    "language_code": "ru",
    # намеренно присутствует во ВХОДЕ, но не должен попасть в выход
    "photo_url": "https://t.me/i/userpic/320/example.jpg",
}


def _sign_hmac(fields: dict) -> str:
    """Собирает валидный initData, подписанный по схеме владельца бота."""
    dcs = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    digest = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": digest})


def _base_fields() -> dict:
    return {
        "auth_date": str(int(time.time())),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": json.dumps(USER, separators=(",", ":"), ensure_ascii=False),
    }


def check(name: str, fn) -> None:
    try:
        fn()
    except AssertionError as exc:
        print(f"FAIL: {name}\n  {exc}")
        raise SystemExit(1)
    print(f"  ok  {name}")


# ─── HMAC ────────────────────────────────────────────────────────────────
def test_hmac_valid():
    payload = ta.validate_init_data_hmac(_sign_hmac(_base_fields()), BOT_TOKEN)
    assert payload["user"]["id"] == 777000, payload
    assert payload["user"]["username"] == "neurocoder", payload


def test_hmac_rejects_tampered_user():
    """РЕГРЕССИЯ: подмена user.id после подписи обязана ловиться."""
    fields = _base_fields()
    init_data = _sign_hmac(fields)
    forged = dict(USER)
    forged["id"] = 999999
    tampered = init_data.replace(
        urlencode({"user": fields["user"]}).split("=", 1)[1],
        urlencode({"user": json.dumps(forged, separators=(",", ":"))}).split("=", 1)[1],
    )
    try:
        ta.validate_init_data_hmac(tampered, BOT_TOKEN)
    except ta.TelegramAuthError:
        return
    raise AssertionError("подделанный user.id прошёл валидацию — вход под чужим ID")


def test_hmac_rejects_wrong_token():
    try:
        ta.validate_init_data_hmac(_sign_hmac(_base_fields()), "999:WRONG-TOKEN")
    except ta.TelegramAuthError:
        return
    raise AssertionError("initData принят с чужим bot_token")


def test_hmac_rejects_missing_hash():
    try:
        ta.validate_init_data_hmac(urlencode(_base_fields()), BOT_TOKEN)
    except ta.TelegramAuthError:
        return
    raise AssertionError("initData без hash принят")


def test_hmac_rejects_expired():
    """auth_date старше суток — replay-атака."""
    fields = _base_fields()
    fields["auth_date"] = str(int(time.time()) - 25 * 3600)
    try:
        ta.validate_init_data_hmac(_sign_hmac(fields), BOT_TOKEN)
    except ta.TelegramAuthError as exc:
        assert "expired" in str(exc), exc
        return
    raise AssertionError("протухший initData принят")


def test_hmac_short_max_age():
    fields = _base_fields()
    fields["auth_date"] = str(int(time.time()) - 600)
    try:
        ta.validate_init_data_hmac(_sign_hmac(fields), BOT_TOKEN, max_age_seconds=300)
    except ta.TelegramAuthError:
        return
    raise AssertionError("max_age_seconds не соблюдается")


def test_photo_url_dropped():
    """GDPR-минимизация (L1): photo_url не должен попадать в payload."""
    payload = ta.validate_init_data_hmac(_sign_hmac(_base_fields()), BOT_TOKEN)
    assert "photo_url" not in payload["user"], payload["user"]


# ─── Ed25519 ─────────────────────────────────────────────────────────────
def _sign_ed25519(fields: dict, private_key: Ed25519PrivateKey) -> str:
    dcs_parts = [f"{BOT_ID}:WebAppData"]
    dcs_parts += [f"{k}={v}" for k, v in sorted(fields.items())]
    signature = private_key.sign("\n".join(dcs_parts).encode())
    b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return urlencode({**fields, "signature": b64})


def test_ed25519_rejects_foreign_key():
    """Подпись чужим ключом не должна проходить против ключа Telegram."""
    fields = _base_fields()
    init_data = _sign_ed25519(fields, Ed25519PrivateKey.generate())
    try:
        ta.validate_init_data_ed25519(init_data, BOT_ID)
    except ta.TelegramAuthError:
        return
    raise AssertionError("подпись чужим ключом принята")


def test_prod_key_is_valid_ed25519():
    """Ключ из официальной доки должен быть корректной точкой Ed25519."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    raw = bytes.fromhex(ta.TELEGRAM_ED25519_PUBLIC_KEY_PROD)
    assert len(raw) == 32, len(raw)
    Ed25519PublicKey.from_public_bytes(raw)


if __name__ == "__main__":
    print("Telegram initData validation")
    check("hmac: валидные данные принимаются", test_hmac_valid)
    check("hmac: подмена user.id отвергается", test_hmac_rejects_tampered_user)
    check("hmac: чужой bot_token отвергается", test_hmac_rejects_wrong_token)
    check("hmac: без hash отвергается", test_hmac_rejects_missing_hash)
    check("hmac: протухший auth_date отвергается", test_hmac_rejects_expired)
    check("hmac: max_age_seconds соблюдается", test_hmac_short_max_age)
    check("payload: photo_url отбрасывается", test_photo_url_dropped)

    _priv = Ed25519PrivateKey.generate()
    _pub_hex = _priv.public_key().public_bytes_raw().hex()

    def _ed_valid():
        fields = _base_fields()
        init_data = _sign_ed25519(fields, _priv)
        original = ta.TELEGRAM_ED25519_PUBLIC_KEY_PROD
        ta.TELEGRAM_ED25519_PUBLIC_KEY_PROD = _pub_hex
        try:
            payload = ta.validate_init_data_ed25519(init_data, BOT_ID)
            assert payload["user"]["id"] == 777000, payload
        finally:
            ta.TELEGRAM_ED25519_PUBLIC_KEY_PROD = original

    check("ed25519: валидная подпись принимается", _ed_valid)
    check("ed25519: чужой ключ отвергается", test_ed25519_rejects_foreign_key)
    check("ed25519: prod-ключ Telegram корректен", test_prod_key_is_valid_ed25519)
    print("PASS")
