const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const chromePanelScript = fs.readFileSync(path.resolve(__dirname, '../../src/scripts/panel.js'), 'utf8');
const firefoxPanelScript = fs.readFileSync(path.resolve(__dirname, '../../src/scripts/panel-firefox.js'), 'utf8');

test('abre o painel Chrome sem aguardar nenhuma promise', async () => {
  let openedWith;
  const context = vm.createContext({
    chrome: { sidePanel: { open(options) { openedWith = options; return Promise.resolve(); } } }
  });
  vm.runInContext(chromePanelScript, context);

  const opening = context.openCrmPanel({ windowId: 7 });

  assert.equal(openedWith.windowId, 7);
  await opening;
});

test('usa a aba enviada pelo atalho do Chrome', async () => {
  let openedWith;
  const context = vm.createContext({
    chrome: {
      sidePanel: { open(options) { openedWith = options; return Promise.resolve(); } },
      tabs: { query() { throw new Error('o atalho nao deve consultar abas antes de abrir'); } }
    }
  });
  vm.runInContext(chromePanelScript, context);

  await context.openCrmPanelFromCommand({ id: 42, windowId: 7 });

  assert.equal(openedWith.tabId, 42);
});

test('abre a barra lateral do Firefox dentro do handler do atalho', async () => {
  let opened = false;
  const context = vm.createContext({
    browser: { sidebarAction: { open() { opened = true; return Promise.resolve(); } } }
  });
  vm.runInContext(firefoxPanelScript, context);

  const opening = context.openCrmPanelFromCommand({ id: 42 });

  assert.equal(opened, true);
  await opening;
});

test('informa erro quando o navegador nao oferece painel lateral', async () => {
  const context = vm.createContext({});
  vm.runInContext(chromePanelScript, context);

  await assert.rejects(context.openCrmPanel({ tabId: 42 }), /nao oferece suporte/i);
});
