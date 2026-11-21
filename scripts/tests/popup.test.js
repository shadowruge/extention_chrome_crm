const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const popupScript = fs.readFileSync(path.join(root, 'src/scripts/popup.js'), 'utf8');
const panelScripts = {
  chrome: fs.readFileSync(path.join(root, 'src/scripts/panel.js'), 'utf8'),
  firefox: fs.readFileSync(path.join(root, 'src/scripts/panel-firefox.js'), 'utf8')
};

function flush() {
  return new Promise(resolve => setImmediate(resolve));
}

function createPopup(browserKind, openImpl) {
  const listeners = {};
  const calls = [];
  const openPanelBtn = { disabled: false, addEventListener(type, listener) { listeners[type] = listener; } };
  const popupNotice = { textContent: '', hidden: true };
  const document = {
    getElementById(id) {
      return { openPanelBtn, popupNotice }[id];
    }
  };
  const chrome = browserKind === 'chrome'
    ? {
        sidePanel: { open(options) { calls.push(options); return openImpl(options); } },
        windows: { getCurrent() { return Promise.resolve({ id: 7 }); } }
      }
    : {};
  const browser = browserKind === 'firefox'
    ? { sidebarAction: { open() { calls.push({ sidebar: true }); return openImpl(); } } }
    : undefined;
  let closed = false;
  const context = vm.createContext({
    document,
    chrome,
    browser,
    window: { close() { closed = true; } },
    Promise
  });

  vm.runInContext(panelScripts[browserKind], context);
  vm.runInContext(popupScript, context);

  return {
    calls,
    openPanelBtn,
    popupNotice,
    get closed() { return closed; },
    async ready() { await flush(); },
    click() { listeners.click(); },
    async settle() { await flush(); }
  };
}

test('popup do Firefox chama a barra lateral no próprio clique', async () => {
  const popup = createPopup('firefox', () => Promise.resolve());

  popup.click();

  assert.deepEqual(popup.calls, [{ sidebar: true }]);
  await popup.settle();
  assert.equal(popup.closed, true);
});

test('popup do Chrome usa a janela preparada antes do clique', async () => {
  const popup = createPopup('chrome', () => Promise.resolve());
  await popup.ready();
  assert.equal(popup.openPanelBtn.disabled, false);

  popup.click();

  assert.equal(popup.calls.length, 1);
  assert.equal(popup.calls[0].windowId, 7);
  await popup.settle();
  assert.equal(popup.closed, true);
});

test('popup mostra erro quando a API do painel falha', async () => {
  const popup = createPopup('firefox', () => Promise.reject(new Error('user action')));

  popup.click();
  await popup.settle();

  assert.match(popup.popupNotice.textContent, /user action/i);
  assert.equal(popup.popupNotice.hidden, false);
  assert.equal(popup.closed, false);
});
