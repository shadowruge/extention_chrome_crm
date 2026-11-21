const test = require('node:test');
const assert = require('node:assert/strict');
const CrmCalendar = require('../../src/scripts/calendar.js');

test('gera chaves de data no fuso local', () => {
  assert.equal(CrmCalendar.dateKey(new Date(2026, 10, 21, 23, 30)), '2026-11-21');
  assert.equal(CrmCalendar.dateKey(new Date('data invalida')), '');
});

test('rejeita datas inexistentes', () => {
  assert.equal(CrmCalendar.isValidDateKey('2026-11-21'), true);
  assert.equal(CrmCalendar.isValidDateKey('2026-02-30'), false);
  assert.equal(CrmCalendar.isValidDateKey('21/11/2026'), false);
});

test('descarta anotações invalidas e limita o texto', () => {
  const notes = CrmCalendar.normalizeNotes({
    '2026-11-21': [
      { id: 'a', texto: ' Primeira ', criadoEm: '2026-11-21T10:00:00.000Z' },
      { id: '', texto: 'sem id' },
      { id: 'b', texto: 'x'.repeat(1200) }
    ],
    invalida: [{ id: 'c', texto: 'ignorada' }],
    '2026-02-30': [{ id: 'd', texto: 'ignorada' }]
  });

  assert.deepEqual(Object.keys(notes), ['2026-11-21']);
  assert.equal(notes['2026-11-21'].length, 2);
  assert.equal(notes['2026-11-21'][0].texto, 'Primeira');
  assert.equal(notes['2026-11-21'][1].texto.length, CrmCalendar.MAX_NOTE_LENGTH);
});

test('monta seis semanas completas começando na segunda', () => {
  const grid = CrmCalendar.monthGrid(2026, 10);

  assert.equal(grid.length, 42);
  assert.equal(grid[0].key, '2026-10-26');
  assert.equal(grid.filter(day => day.inMonth).length, 30);
  assert.equal(grid.find(day => day.key === '2026-11-01').inMonth, true);
  assert.match(CrmCalendar.monthLabel(2026, 10), /novembro de 2026/i);
});

test('ordena as anotações do dia pela data de criação', () => {
  const notes = {
    '2026-11-21': [
      { id: 'b', texto: 'Segunda', criadoEm: '2026-11-21T12:00:00.000Z' },
      { id: 'a', texto: 'Primeira', criadoEm: '2026-11-21T08:00:00.000Z' }
    ]
  };

  assert.deepEqual(CrmCalendar.notesForDay(notes, '2026-11-21').map(note => note.id), ['a', 'b']);
  assert.deepEqual(CrmCalendar.notesForDay(notes, '2026-11-22'), []);
});
