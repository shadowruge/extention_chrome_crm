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
  
  // Observar mudanças no DOM (mensagens novas)
  observeMessages();
  
  // Configurar atalhos/respostas rápidas
  setupQuickReplies();
  
  // Registrar mensagens para comunicação com o background
  registerMessageListeners();
}

function isWhatsAppWeb() {
  return window.location.href.includes('web.whatsapp.com');
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .crm-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #48bb78;
      color: white;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 0.65rem;
      font-weight: bold;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    
    .crm-action-btn {
      position: absolute;
      top: 8px;
      right: 40px;
      background: #e2e8f0;
      color: #2d3743;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 0.65rem;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .crm-action-btn:hover {
      background: #a0aec0;
    }
    
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

function observeMessages() {
  // Observador de mensagens no WhatsApp Web
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Verificar se novas mensagens foram adicionadas
      if (mutation.addedNodes.length > 0) {
        // Processar novas mensagens aqui
        // Isso será ativado quando o usuário abrir o painel lateral
      }
    });
  });
  
  // Observar o container de mensagens
  const messageContainer = document.querySelector('[role="main"]');
  if (messageContainer) {
    observer.observe(messageContainer, { childList: true, subtree: true });
  }
}

function setupQuickReplies() {
  // Criar botão de resposta rápida flutuante
  const btn = document.createElement('div');
  btn.className = 'crm-action-btn';
  btn.textContent = 'Respostas';
  btn.title = 'Abrir respostas rápidas';
  
  // Posicionar no primeiro elemento de mensagem encontrado
  const firstMessage = document.querySelector('[data-testid="msg-container"]');
  if (firstMessage && !document.querySelector('.crm-action-btn')) {
    firstMessage.appendChild(btn);
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openSidePanel' });
    });
  }
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

function findChatEditor() {
  return document.querySelector('footer [contenteditable="true"][role="textbox"]')
    || document.querySelector('[contenteditable="true"][role="textbox"][data-tab="10"]')
    || document.querySelector('div[contenteditable="true"][data-lexical-editor="true"]')
    || document.querySelector('[contenteditable="true"][role="textbox"]');
}

function enviarNoWhatsApp(texto) {
  if (!texto) return false;

  const editor = findChatEditor();
  if (!editor) return false;

  editor.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const currentText = (editor.innerText || editor.textContent || '').trimEnd();
  if (currentText === texto || currentText.endsWith(`\n${texto}`)) return true;

  const insertedText = currentText ? `\n${texto}` : texto;
  document.execCommand('insertText', false, insertedText);

  return true;
}