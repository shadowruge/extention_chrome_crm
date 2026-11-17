const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const chromePanelScript = fs.readFileSync(path.resolve(__dirname, '../../src/scripts/panel.js'), 'utf8');
const firefoxPanelScript = fs.readFileSync(path.resolve(__dirname, '../../src/scripts/panel-firefox.js'), 'utf8');

test('abre o painel Chrome com a aba atual', async () => {
  let openedWith;
  const context = vm.createContext({
    chrome: { sidePanel: { async open(options) { openedWith = options; } } }
  });
  vm.runInContext(chromePanelScript, context);

  await context.openCrmPanel(42);

  assert.equal(openedWith.tabId, 42);
});

test('usa a barra lateral do Firefox quando a API Chrome nao existe', async () => {
  let openCount = 0;
  const context = vm.createContext({ browser: { sidebarAction: { async open() { openCount++; } } } });
  vm.runInContext(firefoxPanelScript, context);

  await context.openCrmPanel(42);

  assert.equal(openCount, 1);
});

test('informa erro quando o navegador nao oferece painel lateral', async () => {
  const context = vm.createContext({});
  vm.runInContext(chromePanelScript, context);

  await assert.rejects(context.openCrmPanel(42), /nao oferece suporte/i);
});
