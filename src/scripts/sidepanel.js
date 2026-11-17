let data = { clientData: {}, quickReplies: [], attendanceHistory: [] };
let editingReplyId = null;
let hasPrivacyConsent = false;
const PRIVACY_CONSENT_VERSION = '1';

function showPanelNotice(message) {
  let notice = document.getElementById('panelNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'panelNotice';
    document.body.appendChild(notice);
  }
  notice.textContent = message;
  notice.classList.add('visible');
  window.setTimeout(() => notice.classList.remove('visible'), 3200);
}

const clienteNome = document.getElementById('clienteNome');
const clienteTelefone = document.getElementById('clienteTelefone');
const clienteEtiqueta = document.getElementById('clienteEtiqueta');
const clientesList = document.getElementById('clientesList');
const mensagem = document.getElementById('mensagem');
const respostasList = document.getElementById('respostasList');
const salvarRespostaBtn = document.getElementById('salvarRespostaBtn');

async function send(action, dados) {
  return chrome.runtime.sendMessage({ action, dados });
}

async function refreshData() {
  if (!hasPrivacyConsent) return;
  const stored = await chrome.storage.local.get(['clientData', 'quickReplies', 'attendanceHistory']);
  data = {
    clientData: stored.clientData && typeof stored.clientData === 'object' ? stored.clientData : {},
    quickReplies: Array.isArray(stored.quickReplies) ? stored.quickReplies : [],
    attendanceHistory: Array.isArray(stored.attendanceHistory) ? stored.attendanceHistory : []
  };
  renderClients();
  renderReplies();
  renderStats();
}

function renderClients() {
  const clients = Object.values(data.clientData || {});
  if (!clients.length) {
    clientesList.className = 'list-empty';
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Nenhum cliente cadastrado ainda';
    clientesList.replaceChildren(emptyMessage);
    return;
  }

  clientesList.className = 'list-items';
  const clientElements = clients.map(client => {
    const id = String(client.id || '');
    const name = String(client.nome || '');
    const article = document.createElement('article');
    article.className = 'crm-client-item';
    article.dataset.id = id;

    const details = document.createElement('div');
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'client-open';
    openButton.dataset.id = id;
    openButton.title = 'Abrir conversa no WhatsApp';
    const nameElement = document.createElement('strong');
    nameElement.textContent = name;
    openButton.append(nameElement);

    const tagSelect = document.createElement('select');
    tagSelect.className = 'client-tag-select';
    tagSelect.dataset.id = id;
    tagSelect.setAttribute('aria-label', `Etiqueta de ${name}`);
    for (const [value, label] of [
      ['novo', 'Novo'],
      ['qualificado', 'Qualificado'],
      ['em-negociacao', 'Em Negociação'],
      ['cliente', 'Cliente']
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = client.etiqueta === value;
      tagSelect.append(option);
    }

    const phone = document.createElement('span');
    phone.className = client.telefone ? 'client-phone' : 'client-phone muted';
    phone.textContent = client.telefone || 'Telefone nao informado';
    details.append(openButton, tagSelect, phone);

    const actions = document.createElement('div');
    actions.className = 'client-actions';
    const openChatButton = document.createElement('button');
    openChatButton.type = 'button';
    openChatButton.className = 'client-open-chat';
    openChatButton.dataset.id = id;
    openChatButton.textContent = 'Abrir conversa';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'client-delete';
    deleteButton.dataset.id = id;
    deleteButton.setAttribute('aria-label', `Excluir ${name}`);
    deleteButton.textContent = 'Excluir';
    actions.append(openChatButton, deleteButton);
    article.append(details, actions);
    return article;
  });
  clientesList.replaceChildren(...clientElements);

  const openClient = async button => {
    const client = data.clientData[button.dataset.id];
    if (!client) return;
    const phone = String(client.telefone || '').replace(/\D/g, '');
    if (!phone) {
      showPanelNotice('Cadastre o telefone para abrir a conversa.');
      return;
    }
    const url = `https://web.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=`;
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const whatsappTabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    const targetTab = (activeTab?.url?.startsWith('https://web.whatsapp.com/') && activeTab)
      || whatsappTabs.find(tab => tab.windowId === activeTab?.windowId)
      || whatsappTabs[0]
      || activeTab;

    if (!targetTab?.id) {
      showPanelNotice('Nao foi possivel encontrar uma aba para abrir a conversa.');
      return;
    }

    try {
      await chrome.tabs.update(targetTab.id, { url, active: true });
      const response = await chrome.runtime.sendMessage({ action: 'recordClientAttendance', clientId: client.id });
      if (!response?.success) {
        showPanelNotice(response?.error || 'Nao foi possivel registrar o atendimento.');
        return;
      }
      await refreshData();
    } catch (error) {
      showPanelNotice(`Nao foi possivel abrir a conversa: ${error.message}`);
    }
  };

  clientesList.querySelectorAll('.client-open, .client-open-chat').forEach(button => {
    button.addEventListener('click', () => openClient(button));
  });

  clientesList.querySelectorAll('.client-tag-select').forEach(select => {
    select.addEventListener('change', async () => {
      const response = await send('updateClientTag', {
        id: select.dataset.id,
        etiqueta: select.value
      });
      if (!response?.success) {
        showPanelNotice(response?.error || 'Nao foi possivel atualizar a etiqueta.');
      } else {
        showPanelNotice('Etiqueta atualizada.');
      }
      await refreshData();
    });
  });

  clientesList.querySelectorAll('.client-delete').forEach(button => {
    button.addEventListener('click', async () => {
      const response = await send('deleteClient', { id: button.dataset.id });
      if (!response?.success) showPanelNotice(response?.error || 'Nao foi possivel excluir o cliente.');
      await refreshData();
    });
  });
}

function renderReplies() {
  if (!data.quickReplies.length) {
    respostasList.className = 'list-empty';
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Nenhuma resposta salva ainda';
    respostasList.replaceChildren(emptyMessage);
    return;
  }

  respostasList.className = 'list-items';
  const replyElements = data.quickReplies.map(reply => {
    const id = String(reply.id || '');
    const article = document.createElement('article');
    article.className = 'crm-reply-item';
    article.dataset.id = id;
    const message = document.createElement('p');
    message.textContent = String(reply.mensagem || '');
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    for (const [className, label] of [
      ['reply-use', 'Usar'],
      ['reply-edit', 'Editar'],
      ['reply-delete', 'Excluir']
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.dataset.id = id;
      button.textContent = label;
      actions.append(button);
    }
    article.append(message, actions);
    return article;
  });
  respostasList.replaceChildren(...replyElements);

  respostasList.querySelectorAll('.reply-use').forEach(button => {
    button.addEventListener('click', async () => {
      const reply = data.quickReplies.find(item => item.id === button.dataset.id);
      if (!reply) return;
      const response = await chrome.runtime.sendMessage({
        action: 'sendQuickReply',
        mensagem: reply.mensagem
      });
      showPanelNotice(response?.error || (response?.success ? 'Resposta enviada ao campo do WhatsApp.' : 'Nao foi possivel usar a resposta.'));
    });
  });

  respostasList.querySelectorAll('.reply-edit').forEach(button => {
    button.addEventListener('click', () => {
      const reply = data.quickReplies.find(item => item.id === button.dataset.id);
      if (!reply) return;
      editingReplyId = reply.id;
      mensagem.value = reply.mensagem;
      salvarRespostaBtn.textContent = 'Atualizar Resposta';
      mensagem.focus();
    });
  });

  respostasList.querySelectorAll('.reply-delete').forEach(button => {
    button.addEventListener('click', async () => {
      const response = await send('deleteQuickReply', { id: button.dataset.id });
      if (!response?.success) showPanelNotice(response?.error || 'Nao foi possivel excluir a resposta.');
      if (editingReplyId === button.dataset.id) resetReplyForm();
      await refreshData();
    });
  });
}

function resetReplyForm() {
  editingReplyId = null;
  mensagem.value = '';
  salvarRespostaBtn.textContent = 'Salvar Resposta';
}

function renderStats() {
  const report = CrmMetrics.calculate(data.clientData, data.attendanceHistory);
  const totalClientes = Object.keys(data.clientData || {}).length;
  const totalRespostas = data.quickReplies.length;
  document.getElementById('totalClientes').textContent = totalClientes;
  document.getElementById('totalAtendimentos').textContent = report.totalAtendimentos;
  document.getElementById('clientesAtendidos').textContent = report.totalClientesAtendidos;
  document.getElementById('mediaDiaria').textContent = report.mediaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  document.getElementById('dashboardClientes').textContent = totalClientes;
  document.getElementById('dashboardRespostas').textContent = totalRespostas;
  renderAttendanceCharts(report);
}

function renderAttendanceCharts(report) {
  const clientChart = document.getElementById('clientAttendanceChart');
  const clients = report.byClient;

  if (!clients.length) {
    clientChart.className = 'chart-empty';
    clientChart.textContent = 'Ainda não há atendimentos registrados.';
  } else {
    clientChart.className = 'client-chart';
    const maxCount = clients[0].count;
    clientChart.replaceChildren(...clients.slice(0, 10).map(client => {
      const row = document.createElement('div');
      row.className = 'client-chart-row';
      const label = document.createElement('span');
      label.className = 'client-chart-label';
      label.textContent = client.name;
      const track = document.createElement('div');
      track.className = 'chart-track';
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.width = `${Math.max(4, (client.count / maxCount) * 100)}%`;
      track.appendChild(bar);
      const count = document.createElement('strong');
      count.className = 'chart-count';
      count.textContent = client.count;
      row.append(label, track, count);
      return row;
    }));
  }

  const frequencyChart = document.getElementById('attendanceFrequencyChart');
  const days = report.days;
  const maxDailyCount = Math.max(...days.map(day => day.count), 1);
  frequencyChart.replaceChildren(...days.map(day => {
    const column = document.createElement('div');
    column.className = 'frequency-column';
    const count = document.createElement('span');
    count.className = 'frequency-count';
    count.textContent = day.count;
    const track = document.createElement('div');
    track.className = 'frequency-track';
    const bar = document.createElement('div');
    bar.className = 'frequency-bar';
    bar.style.height = `${day.count ? Math.max(6, (day.count / maxDailyCount) * 100) : 0}%`;
    track.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'frequency-label';
    label.textContent = day.label;
    column.append(count, track, label);
    return column;
  }));
}

async function initializePrivacy() {
  const stored = await chrome.storage.local.get('privacyConsentVersion');
  if (stored.privacyConsentVersion === PRIVACY_CONSENT_VERSION) {
    hasPrivacyConsent = true;
    document.getElementById('privacyConsent').hidden = true;
    await refreshData();
    return;
  }
  document.getElementById('privacyConsent').hidden = false;
  document.getElementById('acceptPrivacyBtn').focus();
}

document.getElementById('acceptPrivacyBtn').addEventListener('click', async () => {
  const response = await chrome.runtime.sendMessage({ action: 'acceptPrivacyConsent' });
  if (!response?.success) {
    showPanelNotice(response?.error || 'Nao foi possivel registrar sua escolha.');
    return;
  }
  hasPrivacyConsent = true;
  document.getElementById('privacyConsent').hidden = true;
  await refreshData();
});

document.getElementById('declinePrivacyBtn').addEventListener('click', () => window.close());

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const backup = {
    exportedAt: new Date().toISOString(),
    clientData: data.clientData,
    quickReplies: data.quickReplies,
    attendanceHistory: data.attendanceHistory
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `whatsapp-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showPanelNotice('Backup exportado. Guarde o arquivo com segurança.');
});

document.getElementById('deleteDataBtn').addEventListener('click', async () => {
  const confirmed = window.confirm('Isso apagará clientes, respostas e indicadores deste perfil do navegador, além de revogar o consentimento. Deseja continuar?');
  if (!confirmed) return;
  const response = await chrome.runtime.sendMessage({ action: 'clearCrmData' });
  if (!response?.success) {
    showPanelNotice(response?.error || 'Nao foi possivel apagar os dados.');
    return;
  }
  hasPrivacyConsent = false;
  data = { clientData: {}, quickReplies: [], attendanceHistory: [] };
  document.getElementById('privacyConsent').hidden = false;
});

document.getElementById('pixKey').textContent = CrmPix.key;
document.getElementById('copyPixBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(CrmPix.copyPaste);
    showPanelNotice('Código Pix copiado. Confirme o recebedor antes de pagar.');
  } catch (error) {
    showPanelNotice(`Nao foi possivel copiar o codigo Pix: ${error.message}`);
  }
});

document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    document.querySelectorAll('nav a').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.section)?.classList.add('active');
  });
});

document.getElementById('closeBtn').addEventListener('click', () => window.close());

document.getElementById('addClienteBtn').addEventListener('click', async () => {
  const nome = clienteNome.value.trim();
  const telefone = clienteTelefone.value.replace(/\D/g, '');
  if (!nome) {
    clienteNome.focus();
    return;
  }
  if (telefone && (telefone.length < 10 || telefone.length > 15)) {
    showPanelNotice('Informe o telefone com DDD e codigo do pais.');
    clienteTelefone.focus();
    return;
  }
  const response = await send('saveClient', { nome, telefone, etiqueta: clienteEtiqueta.value });
  if (!response?.success) {
    showPanelNotice(response?.error || 'Nao foi possivel salvar o cliente.');
    return;
  }
  clienteNome.value = '';
  clienteTelefone.value = '';
  await refreshData();
});

clienteNome.addEventListener('keydown', event => {
  if (event.key === 'Enter') document.getElementById('addClienteBtn').click();
});

salvarRespostaBtn.addEventListener('click', async () => {
  const texto = mensagem.value.trim();
  if (!texto) {
    mensagem.focus();
    return;
  }
  const response = await send(editingReplyId ? 'updateQuickReply' : 'saveQuickReply', {
    id: editingReplyId,
    mensagem: texto
  });
  if (!response?.success) {
    showPanelNotice(response?.error || 'Nao foi possivel salvar a resposta.');
    return;
  }
  resetReplyForm();
  await refreshData();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && hasPrivacyConsent && (
    changes.clientData || changes.quickReplies || changes.attendanceHistory
  )) {
    refreshData();
  }
});

initializePrivacy().catch(error => {
  showPanelNotice(`Nao foi possivel carregar as preferencias de privacidade: ${error.message}`);
});
