const test = require('node:test');
const assert = require('node:assert/strict');
const { createBackground } = require('./helpers');

test('exige consentimento e nao carrega dados do CRM antes dele', async () => {
  const app = createBackground({
    clientData: { legacy: { id: 'legacy', nome: 'Cliente existente' } },
    quickReplies: []
  });

  const response = await app.send({ action: 'getData' });
  assert.equal(response.success, false);
  assert.match(response.error, /privacidade/i);
  assert.deepEqual(Array.from(app.reads, keys => Array.from(keys)), [['privacyConsentVersion', 'panelSide']]);
  assert.deepEqual(Object.keys(app.storage).sort(), ['clientData', 'quickReplies']);
});

test('salva, atualiza etiqueta e agrega atendimentos por cliente', async () => {
  const app = createBackground();
  assert.equal((await app.send({ action: 'acceptPrivacyConsent' })).success, true);

  const first = await app.send({
    action: 'saveClient',
    dados: { nome: 'Cliente A', telefone: '5511999999999', etiqueta: 'novo' }
  });
  const second = await app.send({
    action: 'saveClient',
    dados: { nome: 'Cliente B', telefone: '5511888888888', etiqueta: 'cliente' }
  });
  assert.equal(first.success, true);
  assert.equal(second.success, true);

  assert.equal((await app.send({
    action: 'updateClientTag',
    dados: { id: first.dados.id, etiqueta: 'qualificado' }
  })).success, true);
  assert.equal((await app.send({
    action: 'updateClientTag',
    dados: { id: first.dados.id, etiqueta: 'arbitraria' }
  })).success, false);

  await app.send({ action: 'recordClientAttendance', clientId: first.dados.id });
  await app.send({ action: 'recordClientAttendance', clientId: first.dados.id });
  await app.send({ action: 'recordClientAttendance', clientId: second.dados.id });
  const data = await app.send({ action: 'getData' });

  assert.equal(data.totalAtendimentos, 3);
  assert.equal(data.clientData[first.dados.id].atendimentos, 2);
  assert.equal(data.clientData[first.dados.id].etiqueta, 'qualificado');
  assert.equal(data.clientData[second.dados.id].atendimentos, 1);
  assert.equal(data.attendanceHistory.length, 3);
});

test('valida dados pessoais e oferece ciclo completo de respostas rápidas', async () => {
  const app = createBackground();
  await app.send({ action: 'acceptPrivacyConsent' });

  assert.equal((await app.send({
    action: 'saveClient',
    dados: { nome: 'Nome', telefone: '123', etiqueta: 'novo' }
  })).success, false);
  assert.equal((await app.send({
    action: 'saveClient',
    dados: { nome: 'N'.repeat(101), telefone: '', etiqueta: 'novo' }
  })).success, false);

  const created = await app.send({ action: 'saveQuickReply', dados: { mensagem: 'Primeira versão' } });
  const replyId = created.quickReplies[0].id;
  assert.equal((await app.send({
    action: 'updateQuickReply',
    dados: { id: replyId, mensagem: 'Versão atualizada' }
  })).success, true);
  assert.equal((await app.send({
    action: 'saveQuickReply',
    dados: { mensagem: 'x'.repeat(2001) }
  })).success, false);
  assert.equal((await app.send({ action: 'getQuickReplies' })).quickReplies[0].mensagem, 'Versão atualizada');
  assert.equal((await app.send({ action: 'deleteQuickReply', dados: { id: replyId } })).success, true);
  assert.equal((await app.send({ action: 'getQuickReplies' })).quickReplies.length, 0);
});

test('abre o painel Chrome no atalho usando a aba do evento', async () => {
  const app = createBackground();

  app.triggerCommand('open_side_panel', { id: 42 });

  assert.equal(app.sidePanelOpens, 1);
});

test('abre a barra lateral Firefox no atalho sem consultar abas antes', async () => {
  const app = createBackground({}, { firefox: true });

  app.triggerCommand('open_side_panel');

  assert.equal(app.sidebarOpens, 1);
  assert.equal(app.sidePanelOpens, 0);
});

test('persiste clientes e respostas entre inicializacoes e apaga dados ao revogar consentimento', async () => {
  const firstRun = createBackground();
  await firstRun.send({ action: 'acceptPrivacyConsent' });
  const client = await firstRun.send({
    action: 'saveClient',
    dados: { nome: 'Persistente', telefone: '5511999999999', etiqueta: 'novo' }
  });
  const reply = await firstRun.send({ action: 'saveQuickReply', dados: { mensagem: 'Olá' } });
  assert.equal(reply.success, true);

  const restarted = createBackground(firstRun.storage);
  const restored = await restarted.send({ action: 'getData' });
  assert.ok(restored.clientData[client.dados.id]);
  assert.equal(restored.quickReplies[0].mensagem, 'Olá');

  assert.equal((await restarted.send({ action: 'clearCrmData' })).success, true);
  assert.equal((await restarted.send({ action: 'getData' })).success, false);
  assert.deepEqual(Object.keys(restarted.storage), []);
});

test('valida, edita e exclui anotações do calendário por data', async () => {
  const app = createBackground();
  await app.send({ action: 'acceptPrivacyConsent' });

  assert.equal((await app.send({
    action: 'saveCalendarNote',
    dados: { dia: '2026-02-30', texto: 'Data invalida' }
  })).success, false);
  assert.equal((await app.send({
    action: 'saveCalendarNote',
    dados: { dia: '2026-11-21', texto: '   ' }
  })).success, false);

  const created = await app.send({
    action: 'saveCalendarNote',
    dados: { dia: '2026-11-21', texto: '  Visita ao cliente  ' }
  });
  assert.equal(created.success, true);
  assert.equal(created.note.texto, 'Visita ao cliente');
  assert.equal(created.calendarNotes['2026-11-21'].length, 1);

  const id = created.note.id;
  assert.equal((await app.send({
    action: 'updateCalendarNote',
    dados: { id, texto: 'Visita confirmada' }
  })).success, true);
  const data = await app.send({ action: 'getData' });
  assert.equal(data.calendarNotes['2026-11-21'][0].texto, 'Visita confirmada');

  assert.equal((await app.send({ action: 'deleteCalendarNote', dados: { id } })).success, true);
  const afterDelete = await app.send({ action: 'getData' });
  assert.equal(afterDelete.calendarNotes['2026-11-21'], undefined);
});

test('persiste anotações e remove os dados ao revogar consentimento', async () => {
  const first = createBackground();
  await first.send({ action: 'acceptPrivacyConsent' });
  await first.send({ action: 'saveCalendarNote', dados: { dia: '2026-11-22', texto: 'Ligar para o cliente' } });

  const restarted = createBackground(first.storage);
  const restored = await restarted.send({ action: 'getData' });
  assert.equal(restored.calendarNotes['2026-11-22'][0].texto, 'Ligar para o cliente');

  await restarted.send({ action: 'clearCrmData' });
  assert.equal(restarted.storage.calendarNotes, undefined);
  assert.equal((await restarted.send({ action: 'getData' })).success, false);
});

test('salva a posição do painel e aplica o layout quando o navegador suporta', async () => {
  const app = createBackground();
  assert.equal((await app.send({ action: 'getPanelSide' })).side, 'right');

  const changed = await app.send({ action: 'setPanelSide', dados: { side: 'left' } });
  assert.equal(changed.success, true);
  assert.equal(changed.layoutApplied, true);
  assert.equal(app.chrome.sidePanel.lastLayout.side, 'left');
  assert.equal(app.storage.panelSide, 'left');

  const firefox = createBackground({}, { firefox: true });
  const firefoxChange = await firefox.send({ action: 'setPanelSide', dados: { side: 'left' } });
  assert.equal(firefoxChange.layoutApplied, false);
  assert.equal(firefox.storage.panelSide, 'left');
});
