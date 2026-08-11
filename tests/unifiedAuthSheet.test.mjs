/**
 * tests/unifiedAuthSheet.test.mjs
 *
 * 2026-08-11. Тесты дизайн-логики единой шторки входа.
 * Проверяют то, что легко разъезжается при правках: порядок кнопок,
 * reduced-motion, focus-trap с возвратом фокуса, фолбэк GIS→Telegram.
 *
 * Запуск: node tests/unifiedAuthSheet.test.mjs
 */

import assert from 'node:assert/strict';

// ─── Минимальный DOM (без jsdom — держим тесты без зависимостей) ────────
class FakeClassList {
  constructor(el) { this.el = el; }
  get _list() { return (this.el.className || '').split(/\s+/).filter(Boolean); }
  contains(c) { return this._list.includes(c); }
  add(...cs) { this.el.className = [...new Set([...this._list, ...cs])].join(' '); }
  remove(...cs) { this.el.className = this._list.filter((c) => !cs.includes(c)).join(' '); }
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = '';
    this.style = {
      _props: {},
      setProperty(k, v) { this._props[k] = v; },
      getPropertyValue(k) { return this._props[k] ?? ''; },
    };
    this.attributes = {};
    this.listeners = {};
    this._text = '';
    this.disabled = false;
    this.offsetParent = this;
    this.focused = false;
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set innerHTML(v) { this._html = v; if (v) this.children.push(new FakeElement('span')); }
  get innerHTML() { return this._html || ''; }
  get childElementCount() { return this.children.length; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { cs.forEach((c) => this.appendChild(c)); }
  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
      this.parentNode = null;
    }
  }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === globalThis.document.body || node === globalThis.document;
  }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) {
    this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn);
  }
  dispatch(type, event = {}) {
    (this.listeners[type] || []).forEach((fn) => fn({ type, ...event }));
  }
  click() { this.dispatch('click', { preventDefault() {} }); }
  focus() {
    globalThis.document.activeElement = this;
    this.focused = true;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 52 }; }
  _all() { return this.children.flatMap((c) => [c, ...c._all()]); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const parts = sel.split(',').map((s) => s.trim());
    return this._all().filter((el) =>
      parts.some((p) => {
        if (p.startsWith('.')) return new FakeClassList(el).contains(p.slice(1));
        if (p.includes('[')) return el.tagName === p.split('[')[0].toUpperCase();
        return el.tagName === p.toUpperCase();
      })
    );
  }
  get classList() { return new FakeClassList(this); }
}

function installDOM({ reducedMotion = false, hoverNone = false } = {}) {
  const html = new FakeElement('html');
  const body = new FakeElement('body');
  const doc = {
    documentElement: html,
    body,
    activeElement: body,
    listeners: {},
    createElement: (t) => new FakeElement(t),
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    removeEventListener(t, fn) {
      this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn);
    },
    dispatch(t, e = {}) { (this.listeners[t] || []).forEach((fn) => fn(e)); },
  };
  globalThis.document = doc;
  globalThis.window = {
    matchMedia: (q) => ({
      matches: q.includes('prefers-reduced-motion') ? reducedMotion
        : q.includes('hover: none') ? hoverNone : false,
    }),
  };
  globalThis.requestAnimationFrame = (fn) => fn();
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return doc;
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (err) {
    results.push(['FAIL', name, err.message]);
  }
}

// ─── Тесты ──────────────────────────────────────────────────────────────

await test('шторка рендерит Google, Telegram и гостя', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=1');
  const api = mod.showAuthSheet({
    onGoogle() {}, onTelegram() {}, onGuest() {},
  });
  assert.ok(api.element.querySelector('.auth-btn--google'), 'нет кнопки Google');
  assert.ok(api.element.querySelector('.auth-btn--telegram'), 'нет кнопки Telegram');
  assert.ok(api.element.querySelector('.auth-btn--guest'), 'нет кнопки гостя');
  api.close();
});

await test('порядок: возвратник выше Google и Telegram', async () => {
  installDOM();
  globalThis.localStorage.setItem(
    'auth:lastUser',
    JSON.stringify({ name: 'Александр', email: 'a@b.c', provider: 'google' })
  );
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=2');
  const api = mod.showAuthSheet({
    onGoogle() {}, onTelegram() {}, onGuest() {}, onContinue() {},
  });
  const order = api.element
    .querySelectorAll('.auth-btn')
    .map((b) => b.className.match(/auth-btn--(\w+)/)?.[1]);
  assert.equal(order[0], 'continue', `первым должен быть возвратник, получили ${order}`);
  assert.ok(order.indexOf('telegram') > order.indexOf('continue'));
  api.close();
});

await test('«Продолжить как» показывает имя и инициал в аватаре', async () => {
  installDOM();
  globalThis.localStorage.setItem(
    'auth:lastUser', JSON.stringify({ name: 'Александр', provider: 'google' })
  );
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=3');
  const api = mod.showAuthSheet({ onGuest() {}, onContinue() {} });
  const btn = api.element.querySelector('.auth-btn--continue');
  assert.match(btn.textContent, /Продолжить как Александр/);
  assert.equal(btn.querySelector('.auth-btn__avatar').textContent, 'А');
  api.close();
});

await test('magnetic пишет --mx/--my (десктоп)', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=4');
  const api = mod.showAuthSheet({ onTelegram() {}, onGuest() {} });
  const tg = api.element.querySelector('.auth-btn--telegram');
  tg.dispatch('mousemove', { clientX: 200, clientY: 52 });
  assert.notEqual(tg.style.getPropertyValue('--mx'), '', '--mx не выставлен');
  api.close();
});

await test('reduced-motion выключает magnetic и ставит флаг на <html>', async () => {
  installDOM({ reducedMotion: true });
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=5');
  const api = mod.showAuthSheet({ onTelegram() {}, onGuest() {} });
  assert.equal(document.documentElement.getAttribute('data-reduced-motion'), 'true');
  const tg = api.element.querySelector('.auth-btn--telegram');
  tg.dispatch('mousemove', { clientX: 200, clientY: 52 });
  assert.equal(tg.style.getPropertyValue('--mx'), '', 'magnetic не отключён');
  api.close();
});

await test('на тач-устройствах magnetic не навешивается', async () => {
  installDOM({ hoverNone: true });
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=6');
  const api = mod.showAuthSheet({ onTelegram() {}, onGuest() {} });
  const tg = api.element.querySelector('.auth-btn--telegram');
  tg.dispatch('mousemove', { clientX: 200, clientY: 52 });
  assert.equal(tg.style.getPropertyValue('--mx'), '');
  api.close();
});

await test('GIS-рендерер получает контейнер, фолбэк не дублирует кнопку', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=7');
  let gotSlot = null;
  const api = mod.showAuthSheet({
    onGoogle() {}, onGuest() {},
    renderGis(slot) {
      gotSlot = slot;
      slot.appendChild(document.createElement('div'));
    },
  });
  assert.ok(gotSlot, 'renderGis не вызван');
  assert.equal(api.element.querySelectorAll('.auth-btn--google').length, 0,
    'GIS отрисовался, но фолбэк-кнопка всё равно добавлена');
  api.close();
});

await test('GIS упал → появляется своя кнопка Google', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=8');
  const api = mod.showAuthSheet({
    onGoogle() {}, onGuest() {},
    renderGis() { throw new Error('GSI blocked'); },
  });
  assert.ok(api.element.querySelector('.auth-btn--google'), 'нет фолбэк-кнопки');
  api.close();
});

await test('highlightTelegram показывает подсказку в aria-live', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=9');
  const api = mod.showAuthSheet({ onTelegram() {}, onGuest() {} });
  api.highlightTelegram();
  const status = api.element.querySelector('.auth-sheet__status');
  assert.match(status.textContent, /Google недоступен/);
  assert.ok(status.classList.contains('is-visible'));
  assert.equal(status.getAttribute('aria-live'), 'polite');
  api.close();
});

await test('Escape уводит в гостевой режим', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=10');
  let guest = 0;
  mod.showAuthSheet({ onTelegram() {}, onGuest() { guest += 1; } });
  document.dispatch('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(guest, 1, 'Escape не сработал');
  mod.closeAuthSheet();
});

await test('close возвращает фокус на элемент-открыватель', async () => {
  const doc = installDOM();
  const opener = doc.createElement('button');
  doc.body.appendChild(opener);
  opener.focus();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=11');
  const api = mod.showAuthSheet({ onTelegram() {}, onGuest() {} });
  assert.notEqual(doc.activeElement, opener, 'фокус не ушёл в шторку');
  api.close();
  assert.equal(doc.activeElement, opener, 'фокус не вернулся');
});

await test('шторка помечена как модальный диалог', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=12');
  const api = mod.showAuthSheet({ onGuest() {} });
  const sheet = api.element.querySelector('.auth-sheet');
  assert.equal(sheet.getAttribute('role'), 'dialog');
  assert.equal(sheet.getAttribute('aria-modal'), 'true');
  assert.ok(sheet.getAttribute('aria-labelledby'), 'нет aria-labelledby');
  api.close();
});

await test('повторный showAuthSheet не создаёт вторую шторку', async () => {
  installDOM();
  const mod = await import('../js/ui/unifiedAuthSheet.js?case=13');
  const first = mod.showAuthSheet({ onGuest() {} });
  const second = mod.showAuthSheet({ onGuest() {} });
  assert.equal(first, second, 'создано две шторки');
  assert.equal(document.body.children.length, 1);
  first.close();
  assert.equal(mod.isAuthSheetOpen(), false);
});

// ─── Вывод ──────────────────────────────────────────────────────────────
let failed = 0;
for (const [status, name, msg] of results) {
  if (status === 'ok') console.log(`  ok  ${name}`);
  else { failed += 1; console.log(`FAIL: ${name}\n  ${msg}`); }
}
console.log(failed ? `\n${failed} FAILED` : `\nALL ${results.length} PASSED`);
process.exit(failed ? 1 : 0);
