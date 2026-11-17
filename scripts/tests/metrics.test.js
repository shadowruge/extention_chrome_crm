const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../../src/scripts/metrics');

test('calcula totais, clientes recorrentes e frequência dos últimos sete dias', () => {
  const today = new Date(2026, 10, 17, 12);
  const day = offset => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date.toISOString();
  };
  const result = calculate({
    a: { id: 'a', nome: 'Ana', atendimentos: 3 },
    b: { id: 'b', nome: 'Bia', atendimentos: 1 },
    c: { id: 'c', nome: 'Caio', atendimentos: 0 }
  }, [
    { clientId: 'a', timestamp: day(-6) },
    { clientId: 'a', timestamp: day(-1) },
    { clientId: 'b', timestamp: day(0) },
    { clientId: 'missing', timestamp: day(0) },
    { clientId: 'a', timestamp: 'invalid' },
    { clientId: 'a', timestamp: day(-8) }
  ], today);

  assert.equal(result.totalAtendimentos, 4);
  assert.equal(result.totalClientesAtendidos, 2);
  assert.equal(result.mediaDiaria, 0.4);
  assert.deepEqual(result.byClient.map(client => [client.name, client.count]), [['Ana', 3], ['Bia', 1]]);
  assert.equal(result.days.length, 7);
  assert.deepEqual(result.days.map(item => item.count), [1, 0, 0, 0, 0, 1, 1]);
});
