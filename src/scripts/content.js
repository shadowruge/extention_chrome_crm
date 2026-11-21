// Content Script para WhatsApp Web
// Este script injeta a interface da extensão nas páginas do WhatsApp Web

console.log('WhatsApp CRM Content Script carregado');

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // Verificar se estamos no WhatsApp Web
  if (!isWhatsAppWeb()) {
    console.log('Não estamos no WhatsApp Web');
    return;
  }
  
  console.log('Iniciando WhatsApp CRM no WhatsApp Web');
  
  // Injetar CSS estilizado
  injectStyles();

  // Registrar mensagens para comunicação com o background
  registerMessageListeners();
}

function isWhatsAppWeb() {
  return window.location.href.includes('web.whatsapp.com');
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .crm-quick-reply {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      z-index: 9999;
      width: 300px;
      max-width: 90vw;
    }
    
    .crm-quick-reply textarea {
      width: 100%;
      border: none;
      background: transparent;
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
    }
    
    .crm-quick-reply button {
      margin-top: 8px;
      padding: 6px 12px;
      background: #48bb78;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function registerMessageListeners() {
  // Listener para mensagens do popup ou background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'showQuickReply') {
      const inserted = mostrarRespostaRapida(message.mensagem);
      sendResponse({ success: inserted });
      return;
    }
    return true;
  });
}

function mostrarRespostaRapida(mensagem) {
  const existing = document.querySelector('.crm-quick-reply');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'crm-quick-reply';
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Digite ou edite a mensagem...';
  textarea.value = mensagem || '';
  const sendBtn = document.createElement('button');
  sendBtn.id = 'enviarQuickReply';
  sendBtn.type = 'button';
  sendBtn.textContent = 'Inserir no chat';
  overlay.append(textarea, sendBtn);
  
  sendBtn.addEventListener('click', () => {
    const texto = textarea.value.trim();
    if (texto) {
      sendBtn.disabled = true;
      const inserted = enviarNoWhatsApp(texto);
      if (inserted) {
        sendBtn.textContent = 'Inserido';
        window.setTimeout(() => overlay.remove(), 900);
      } else {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Abra uma conversa';
      }
    }
  });
  
  document.body.appendChild(overlay);
  textarea.focus();

  return Boolean(findChatEditor());
}

const EDITOR_SELECTORS = [
  'footer [contenteditable="true"][role="textbox"]',
  '[data-testid="conversation-compose-box-input"]',
  'div[contenteditable="true"][data-lexical-editor="true"]',
  'div[contenteditable="true"][role="textbox"][data-tab="10"]',
  'div[contenteditable="true"][role="textbox"]'
];

function findChatEditor() {
  for (const selector of EDITOR_SELECTORS) {
    for (const candidate of document.querySelectorAll(selector)) {
      if (typeof candidate.getClientRects !== 'function' || candidate.getClientRects().length > 0) {
        return candidate;
      }
    }
  }
  return null;
}

function insertTextAtCursor(editor, texto) {
  editor.focus();
  const selection = window.getSelection();
  if (!selection || typeof document.createRange !== 'function') return false;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);

  if (typeof document.execCommand === 'function' && document.execCommand('insertText', false, texto)) {
    return true;
  }

  const node = document.createTextNode(texto);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  const event = typeof InputEvent === 'function'
    ? new InputEvent('input', { bubbles: true, inputType: 'insertText', data: texto })
    : new Event('input', { bubbles: true });
  editor.dispatchEvent(event);
  return true;
}

function enviarNoWhatsApp(texto) {
  if (!texto) return false;

  const editor = findChatEditor();
  if (!editor) return false;

  const currentText = (editor.innerText || editor.textContent || '').trimEnd();
  if (currentText === texto || currentText.endsWith(`\n${texto}`)) return true;

  const insertedText = currentText ? `\n${texto}` : texto;
  return insertTextAtCursor(editor, insertedText);
}