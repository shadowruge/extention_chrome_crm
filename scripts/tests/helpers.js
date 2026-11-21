const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '../..');

function createBackground(initialStorage = {}, options = {}) {
  const { firefox = false } = options;
  const storage = structuredClone(initialStorage);
  const reads = [];
  const storageListeners = [];
  let messageListener;
  let commandListener;
  let sidePanelOpens = 0;
  let sidebarOpens = 0;
  const chrome = {
    commands: { onCommand: { addListener(listener) { commandListener = listener; } } },
    storage: {
      local: {
        async get(keys) {
          const names = Array.isArray(keys) ? keys : [keys];
          reads.push(names);
          return Object.fromEntries(names.filter(key => key in storage).map(key => [key, structuredClone(storage[key])]));
        },
        async set(values) {
          Object.assign(storage, structuredClone(values));
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
        }
      },
      onChanged: { addListener(listener) { storageListeners.push(listener); } }
    },
    runtime: { onMessage: { addListener(listener) { messageListener = listener; } } },
    tabs: {
      async query() {
        if (firefox) throw new Error('o atalho do Firefox nao deve consultar abas antes de abrir');
        return [{ id: 1 }];
      },
      async sendMessage() { return { success: true }; }
    }
  };
  if (!firefox) {
    chrome.sidePanel = {
      async open() { sidePanelOpens++; },
      async setLayout(options) { chrome.sidePanel.lastLayout = options; }
    };
  }
  const browser = firefox
    ? { sidebarAction: { open() { sidebarOpens++; return Promise.resolve(); } } }
    : undefined;
  const context = vm.createContext({ chrome, browser, console: { log() {} }, crypto: webcrypto, Date });
  const panelScript = firefox ? 'src/scripts/panel-firefox.js' : 'src/scripts/panel.js';
  vm.runInContext(fs.readFileSync(path.join(root, panelScript), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/scripts/calendar.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/scripts/background.js'), 'utf8'), context);

  return {
    storage,
    reads,
    chrome,
    storageListeners,
    get sidePanelOpens() { return sidePanelOpens; },
    get sidebarOpens() { return sidebarOpens; },
    triggerCommand(name, tab) { commandListener(name, tab); },
    async send(message) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${message.action}`)), 1500);
        const keepAlive = messageListener(message, {}, response => {
          clearTimeout(timer);
          resolve(response);
        });
        if (keepAlive !== true) {
          clearTimeout(timer);
          reject(new Error('Listener nao manteve resposta assincrona'));
        }
      });
    }
  };
}

module.exports = { createBackground };
