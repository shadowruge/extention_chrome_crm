(function exposeCalendar(global) {
  const MAX_NOTE_LENGTH = 1000;

  function dateKey(date) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isValidDateKey(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const [year, month, day] = key.split('-').map(Number);
    const value = new Date(year, month - 1, day);
    return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day;
  }

  function normalizeNotes(value) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const [key, entries] of Object.entries(source)) {
      if (!isValidDateKey(key) || !Array.isArray(entries)) continue;
      const clean = entries
        .filter(entry => entry && typeof entry === 'object' && typeof entry.texto === 'string')
        .map(entry => ({
          id: String(entry.id || ''),
          texto: entry.texto.trim().slice(0, MAX_NOTE_LENGTH),
          criadoEm: typeof entry.criadoEm === 'string' ? entry.criadoEm : new Date(0).toISOString()
        }))
        .filter(entry => entry.id && entry.texto);
      if (clean.length) result[key] = clean;
    }
    return result;
  }

  function monthGrid(year, month) {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const value = new Date(start);
      value.setDate(start.getDate() + index);
      return {
        key: dateKey(value),
        day: value.getDate(),
        inMonth: value.getMonth() === month
      };
    });
  }

  function monthLabel(year, month) {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  }

  function notesForDay(notes, key) {
    const entries = Array.isArray(notes?.[key]) ? notes[key] : [];
    return [...entries].sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  }

  const api = Object.freeze({
    MAX_NOTE_LENGTH,
    dateKey,
    isValidDateKey,
    normalizeNotes,
    monthGrid,
    monthLabel,
    notesForDay
  });
  global.CrmCalendar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
