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
  assert.deepEqual(app.reads, [['privacyConsentVersion']]);
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
