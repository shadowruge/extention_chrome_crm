// Background Service Worker para WhatsApp CRM Extension
// Gerencia comunicação entre popup, sidepanel e content scripts

console.log('WhatsApp CRM Background Service Worker carregado');

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'open_side_panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
});

// O MVP mantém os dados localmente no perfil do Chrome.
let clientData = {};
let quickReplies = [];
let attendanceHistory = [];
let privacyConsentAccepted = false;
let crmDataLoaded = false;

const storageReady = chrome.storage.local
  .get('privacyConsentVersion')
  .then(result => {
    privacyConsentAccepted = result.privacyConsentVersion === '1';
  });

async function salvarNoStorage() {
  await chrome.storage.local.set({ clientData, quickReplies, attendanceHistory });
}

async function carregarDadosCrm() {
  if (crmDataLoaded) return;
  const result = await chrome.storage.local.get(['clientData', 'quickReplies', 'attendanceHistory']);
  clientData = result.clientData && typeof result.clientData === 'object' ? result.clientData : {};
  quickReplies = Array.isArray(result.quickReplies) ? result.quickReplies : [];
  attendanceHistory = Array.isArray(result.attendanceHistory) ? result.attendanceHistory : [];
  crmDataLoaded = true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});

async function handleMessage(message, sender) {
  await storageReady;

  if (message.action === 'acceptPrivacyConsent') {
    await chrome.storage.local.set({ privacyConsentVersion: '1' });
    privacyConsentAccepted = true;
    crmDataLoaded = false;
    return { success: true };
  }

  if (message.action === 'clearCrmData') {
    clientData = {};
    quickReplies = [];
    attendanceHistory = [];
    crmDataLoaded = true;
    privacyConsentAccepted = false;
    await chrome.storage.local.remove([
      'clientData',
      'quickReplies',
      'attendanceHistory',
      'totalAtendimentos',
      'privacyConsentVersion'
    ]);
    return { success: true };
  }

  if (message.action === 'openSidePanel') {
    if (sender.tab?.id) await chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    return { success: true };
  }

  if (!privacyConsentAccepted) {
    return { success: false, error: 'Aceite o aviso de privacidade antes de usar o CRM' };
  }
  await carregarDadosCrm();

  if (message.action === 'getData') {
    return {
      type: 'data',
      clientData,
      quickReplies,
      attendanceHistory,
      totalAtendimentos: Object.values(clientData).reduce((sum, client) => sum + (Number.isInteger(client.atendimentos) ? client.atendimentos : 0), 0)
    };
  }

  if (message.action === 'saveClient') {
    const nome = String(message.dados?.nome || '').trim();
    const telefone = String(message.dados?.telefone || '').replace(/\D/g, '');
    const etiqueta = String(message.dados?.etiqueta || 'novo');
    if (!nome) return { success: false, error: 'Informe o nome do cliente' };
    if (nome.length > 100) return { success: false, error: 'O nome deve ter no maximo 100 caracteres' };
    if (telefone && (telefone.length < 10 || telefone.length > 15)) {
      return { success: false, error: 'Informe um telefone com DDD e codigo do pais' };
    }
    if (!['novo', 'qualificado', 'em-negociacao', 'cliente'].includes(etiqueta)) {
      return { success: false, error: 'Etiqueta invalida' };
    }
    const id = `${Date.now()}-${crypto.randomUUID()}`;
    clientData[id] = { id, nome, telefone, etiqueta, criadoEm: new Date().toISOString() };
    await salvarNoStorage();
    return { success: true, dados: clientData[id] };
  }

  if (message.action === 'updateClientTag') {
    const { id, etiqueta } = message.dados || {};
    const allowedTags = ['novo', 'qualificado', 'em-negociacao', 'cliente'];
    if (!clientData[id]) return { success: false, error: 'Cliente nao encontrado' };
    if (!allowedTags.includes(etiqueta)) return { success: false, error: 'Etiqueta invalida' };
    clientData[id].etiqueta = etiqueta;
    await salvarNoStorage();
    return { success: true };
  }

  if (message.action === 'deleteClient') {
    const id = message.dados?.id;
    if (id) {
      delete clientData[id];
      attendanceHistory = attendanceHistory.filter(entry => entry.clientId !== id);
    }
    await salvarNoStorage();
    return { success: true };
  }

  if (message.action === 'saveQuickReply') {
    const cleanMessage = String(message.dados?.mensagem || '').trim();
    if (!cleanMessage) return { success: false, error: 'Informe a mensagem' };
    if (cleanMessage.length > 2000) return { success: false, error: 'A resposta deve ter no maximo 2000 caracteres' };
    const id = message.dados?.id;
    if (id) {
      const index = quickReplies.findIndex(reply => reply.id === id);
      if (index !== -1) {
        quickReplies[index] = { ...quickReplies[index], mensagem: cleanMessage };
      }
    } else {
      quickReplies.push({
        id: `${Date.now()}-${crypto.randomUUID()}`,
        mensagem: cleanMessage,
        criadoEm: new Date().toISOString()
      });
    }
    await salvarNoStorage();
    return { success: true, quickReplies };
  }

  if (message.action === 'getQuickReplies') {
    return { success: true, quickReplies };
  }

  if (message.action === 'updateQuickReply') {
    const cleanMessage = String(message.dados?.mensagem || '').trim();
    if (!cleanMessage) return { success: false, error: 'Informe a mensagem' };
    if (cleanMessage.length > 2000) return { success: false, error: 'A resposta deve ter no maximo 2000 caracteres' };
    const index = quickReplies.findIndex(reply => reply.id === message.dados?.id);
    if (index !== -1) {
      quickReplies[index] = { ...quickReplies[index], mensagem: cleanMessage };
      await salvarNoStorage();
    }
    return { success: true };
  }

  if (message.action === 'deleteQuickReply') {
    quickReplies = quickReplies.filter(reply => reply.id !== message.dados?.id);
    await salvarNoStorage();
    return { success: true };
  }

  if (message.action === 'sendQuickReply') {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (!tabs.length) return { success: false, error: 'Abra o WhatsApp Web em uma aba' };

    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'showQuickReply',
          mensagem: message.mensagem
        });
        if (response?.success) return response;
      } catch (_) {}
    }
    return { success: false, error: 'Nao foi possivel acessar o WhatsApp Web. Recarregue a pagina.' };
  }

  if (message.action === 'recordClientAttendance') {
    const clientId = message.clientId;
    const client = clientData[clientId];
    if (!client) return { success: false, error: 'Cliente nao encontrado' };

    const timestamp = new Date().toISOString();
    client.atendimentos = (Number.isInteger(client.atendimentos) ? client.atendimentos : 0) + 1;
    client.ultimoAtendimento = timestamp;
    attendanceHistory.push({ clientId, timestamp });
    const retentionCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    attendanceHistory = attendanceHistory.filter(entry => Date.parse(entry.timestamp) >= retentionCutoff);
    await salvarNoStorage();
    const totalAtendimentos = Object.values(clientData).reduce(
      (sum, currentClient) => sum + (Number.isInteger(currentClient.atendimentos) ? currentClient.atendimentos : 0),
      0
    );
    return { success: true, totalAtendimentos };
  }

  return { success: false, error: 'Acao desconhecida' };
}