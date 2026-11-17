const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '../..');

function createBackground(initialStorage = {}) {
  const storage = structuredClone(initialStorage);
  const reads = [];
  let messageListener;
  const chrome = {
    commands: { onCommand: { addListener() {} } },
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
      }
    },
    runtime: { onMessage: { addListener(listener) { messageListener = listener; } } },
    sidePanel: { async open() {} },
    tabs: {
      async query() { return []; },
      async sendMessage() { return { success: true }; }
    }
  };
  const context = vm.createContext({ chrome, console: { log() {} }, crypto: webcrypto, Date });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/scripts/panel.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/scripts/background.js'), 'utf8'), context);

  return {
    storage,
    reads,
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
