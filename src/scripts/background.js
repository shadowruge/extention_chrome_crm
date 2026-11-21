// Background Service Worker para WhatsApp CRM Extension
// Gerencia comunicação entre popup, sidepanel e content scripts

console.log('WhatsApp CRM Background Service Worker carregado');

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'open_side_panel') return;
  Promise.resolve(openCrmPanelFromCommand(tab)).catch(error => {
    console.error('Nao foi possivel abrir o painel do CRM:', error);
  });
});

// O MVP mantém os dados localmente no perfil do Chrome.
let clientData = {};
let quickReplies = [];
let attendanceHistory = [];
let calendarNotes = {};
let privacyConsentAccepted = false;
let crmDataLoaded = false;
let panelSide = 'right';

const storageReady = chrome.storage.local
  .get(['privacyConsentVersion', 'panelSide'])
  .then(result => {
    privacyConsentAccepted = result.privacyConsentVersion === '1';
    panelSide = result.panelSide === 'left' ? 'left' : 'right';
    return applyPanelSide(panelSide);
  })
  .catch(() => {});

chrome.storage.onChanged.addListener(changes => {
  if (changes.clientData || changes.quickReplies || changes.attendanceHistory || changes.calendarNotes) {
    crmDataLoaded = false;
  }
  if (changes.panelSide) {
    panelSide = changes.panelSide.newValue === 'left' ? 'left' : 'right';
    applyPanelSide(panelSide);
  }
});

async function salvarNoStorage() {
  await chrome.storage.local.set({ clientData, quickReplies, attendanceHistory, calendarNotes });
}

async function carregarDadosCrm() {
  if (crmDataLoaded) return;
  const result = await chrome.storage.local.get(['clientData', 'quickReplies', 'attendanceHistory', 'calendarNotes']);
  clientData = result.clientData && typeof result.clientData === 'object' ? result.clientData : {};
  quickReplies = Array.isArray(result.quickReplies) ? result.quickReplies : [];
  attendanceHistory = Array.isArray(result.attendanceHistory) ? result.attendanceHistory : [];
  calendarNotes = CrmCalendar.normalizeNotes(result.calendarNotes);
  crmDataLoaded = true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});

async function handleMessage(message) {
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
    calendarNotes = {};
    crmDataLoaded = true;
    privacyConsentAccepted = false;
    await chrome.storage.local.remove([
      'clientData',
      'quickReplies',
      'attendanceHistory',
      'calendarNotes',
      'totalAtendimentos',
      'privacyConsentVersion'
    ]);
    return { success: true };
  }

  if (message.action === 'getPanelSide') {
    return { success: true, side: panelSide };
  }

  if (message.action === 'setPanelSide') {
    const side = message.dados?.side === 'left' ? 'left' : 'right';
    panelSide = side;
    await chrome.storage.local.set({ panelSide: side });
    let layoutApplied = false;
    try {
      layoutApplied = await applyPanelSide(side);
    } catch (_) {}
    return { success: true, side, layoutApplied };
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
      calendarNotes,
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

  if (message.action === 'saveCalendarNote') {
    const dia = String(message.dados?.dia || '');
    const texto = String(message.dados?.texto || '').trim();
    if (!CrmCalendar.isValidDateKey(dia)) return { success: false, error: 'Data da anotação invalida' };
    if (!texto) return { success: false, error: 'Informe o texto da anotação' };
    if (texto.length > CrmCalendar.MAX_NOTE_LENGTH) {
      return { success: false, error: `A anotação deve ter no maximo ${CrmCalendar.MAX_NOTE_LENGTH} caracteres` };
    }
    const note = {
      id: `${Date.now()}-${crypto.randomUUID()}`,
      texto,
      criadoEm: new Date().toISOString()
    };
    calendarNotes[dia] = [...(calendarNotes[dia] || []), note];
    await salvarNoStorage();
    return { success: true, note, calendarNotes };
  }

  if (message.action === 'updateCalendarNote') {
    const id = String(message.dados?.id || '');
    const texto = String(message.dados?.texto || '').trim();
    if (!texto) return { success: false, error: 'Informe o texto da anotação' };
    if (texto.length > CrmCalendar.MAX_NOTE_LENGTH) {
      return { success: false, error: `A anotação deve ter no maximo ${CrmCalendar.MAX_NOTE_LENGTH} caracteres` };
    }
    let found = false;
    for (const [dia, entries] of Object.entries(calendarNotes)) {
      const index = entries.findIndex(entry => entry.id === id);
      if (index === -1) continue;
      calendarNotes[dia][index] = { ...entries[index], texto, atualizadoEm: new Date().toISOString() };
      found = true;
      break;
    }
    if (!found) return { success: false, error: 'Anotação nao encontrada' };
    await salvarNoStorage();
    return { success: true, calendarNotes };
  }

  if (message.action === 'deleteCalendarNote') {
    const id = String(message.dados?.id || '');
    for (const [dia, entries] of Object.entries(calendarNotes)) {
      const remaining = entries.filter(entry => entry.id !== id);
      if (remaining.length) calendarNotes[dia] = remaining;
      else delete calendarNotes[dia];
    }
    await salvarNoStorage();
    return { success: true, calendarNotes };
  }

  return { success: false, error: 'Acao desconhecida' };
}