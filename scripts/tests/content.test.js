const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const contentScript = fs.readFileSync(path.resolve(__dirname, '../../src/scripts/content.js'), 'utf8');

function createContent(options = {}) {
  const { hiddenFirst = false, execCommandResult = true, currentText = '', noEditor = false } = options;
  const inserted = [];
  const events = [];
  const range = {
    selectNodeContents() {},
    collapse() {},
    insertNode(node) { inserted.push(node); },
    setStartAfter() {}
  };
  const selection = { removeAllRanges() {}, addRange() {} };
  const editor = {
    innerText: currentText,
    focus() {},
    getClientRects: () => [{}],
    dispatchEvent(event) { events.push(event); }
  };
  const hidden = { getClientRects: () => [] };
  const candidates = noEditor ? [] : (hiddenFirst ? [hidden, editor] : [editor]);
  const document = {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll() { return candidates; },
    execCommand(type, ui, value) {
      if (execCommandResult) inserted.push({ command: type, value });
      return execCommandResult;
    },
    createRange: () => range,
    createTextNode: text => ({ text })
  };
  const context = vm.createContext({
    document,
    window: { getSelection: () => selection },
    console: { log() {} },
    Event: class EventStub {},
    InputEvent: class InputEventStub {}
  });
  vm.runInContext(contentScript, context);
  return { context, editor, inserted, events };
}

test('ignora editores invisíveis e usa o primeiro campo visível', () => {
  const { context, editor } = createContent({ hiddenFirst: true });

  assert.equal(context.findChatEditor(), editor);
});

test('insere a resposta pelo comando nativo quando disponível', () => {
  const { context, inserted } = createContent();

  assert.equal(context.enviarNoWhatsApp('Olá'), true);
  assert.equal(inserted[0].command, 'insertText');
  assert.equal(inserted[0].value, 'Olá');
});

test('usa inserção manual com evento input quando o comando falha', () => {
  const { context, inserted, events } = createContent({ execCommandResult: false });

  assert.equal(context.enviarNoWhatsApp('Olá'), true);
  assert.equal(inserted[0].text, 'Olá');
  assert.equal(events.length, 1);
});

test('não insere texto duplicado', () => {
  const { context, inserted } = createContent({ currentText: 'Olá' });

  assert.equal(context.enviarNoWhatsApp('Olá'), true);
  assert.equal(inserted.length, 0);
});

test('informa quando não há campo de mensagem disponível', () => {
  const { context } = createContent({ noEditor: true });

  assert.equal(context.enviarNoWhatsApp('Olá'), false);
});
