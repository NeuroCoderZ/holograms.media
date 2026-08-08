// tests/unit/telegramEnv.test.mjs
// Проверка детектора Telegram Mini App (баг 08.08.2026: 3D отключался у веб-посетителей).
// Запуск: node tests/unit/telegramEnv.test.mjs

import assert from 'node:assert/strict';

const MODULE_PATH = '../../js/core/telegramEnv.js';

// Свежий импорт модуля на каждый кейс не нужен: функция читает window в момент вызова.
function setWindow({ telegram = undefined, hash = '' } = {}) {
    globalThis.window = {
        location: { hash },
        ...(telegram !== undefined ? { Telegram: telegram } : {}),
    };
}

const { isTelegramMiniApp, describeTelegramEnv } = await import(MODULE_PATH);

const cases = [
    {
        name: 'обычный браузер, скрипт telegram-web-app.js загружен (РЕАЛЬНЫЙ БАГ)',
        setup: () => setWindow({
            telegram: { WebApp: { initData: '', initDataUnsafe: {}, platform: 'unknown' } },
        }),
        expected: false,
    },
    {
        name: 'обычный браузер, скрипта Telegram нет вообще',
        setup: () => setWindow({}),
        expected: false,
    },
    {
        name: 'window.Telegram есть, но WebApp отсутствует',
        setup: () => setWindow({ telegram: {} }),
        expected: false,
    },
    {
        name: 'настоящий Telegram Android: непустой initData',
        setup: () => setWindow({
            telegram: {
                WebApp: {
                    initData: 'query_id=AAE&user=%7B%22id%22%3A1%7D&hash=abc',
                    initDataUnsafe: { user: { id: 1 } },
                    platform: 'android',
                },
            },
        }),
        expected: true,
    },
    {
        name: 'настоящий Telegram Desktop: platform=tdesktop без initData',
        setup: () => setWindow({
            telegram: { WebApp: { initData: '', initDataUnsafe: {}, platform: 'tdesktop' } },
        }),
        expected: true,
    },
    {
        name: 'Telegram Web (weba): platform заполнена',
        setup: () => setWindow({
            telegram: { WebApp: { initData: '', initDataUnsafe: {}, platform: 'weba' } },
        }),
        expected: true,
    },
    {
        name: 'платформа unknown, но заполнен initDataUnsafe',
        setup: () => setWindow({
            telegram: {
                WebApp: { initData: '', initDataUnsafe: { user: { id: 42 } }, platform: 'unknown' },
            },
        }),
        expected: true,
    },
    {
        name: 'платформа unknown, но Telegram передал tgWebAppData в URL-хэше',
        setup: () => setWindow({
            telegram: { WebApp: { initData: '', initDataUnsafe: {}, platform: 'unknown' } },
            hash: '#tgWebAppData=query_id%3DAAE&tgWebAppPlatform=ios',
        }),
        expected: true,
    },
];

let passed = 0;
const failures = [];

for (const c of cases) {
    c.setup();
    const actual = isTelegramMiniApp();
    try {
        assert.equal(actual, c.expected);
        passed++;
        console.log(`  ok   ${c.name} -> ${actual}`);
    } catch {
        failures.push(`${c.name}: ожидали ${c.expected}, получили ${actual}`);
        console.error(`  FAIL ${c.name}: ожидали ${c.expected}, получили ${actual}`);
    }
}

// describeTelegramEnv не должен падать и обязан отдавать диагностику.
setWindow({ telegram: { WebApp: { initData: '', initDataUnsafe: {}, platform: 'unknown' } } });
const d = describeTelegramEnv();
assert.equal(d.isTelegram, false);
assert.equal(d.platform, 'unknown');
assert.equal(d.initDataLen, 0);
assert.equal(d.hashMarker, false);
console.log('  ok   describeTelegramEnv отдаёт корректную диагностику');
passed++;

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
