(function exposeMetrics(global) {
  function localDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function calculate(clientData, attendanceHistory, today = new Date()) {
    const clients = Object.values(clientData || {});
    const byClient = clients
      .map(client => ({
        id: client.id,
        name: client.nome,
        count: Number.isInteger(client.atendimentos) && client.atendimentos > 0 ? client.atendimentos : 0
      }))
      .filter(client => client.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: localDateKey(date),
        label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
        count: 0
      };
    });
    const dayCounts = new Map(days.map(day => [day.key, day]));
    const clientIds = new Set(clients.map(client => client.id));

    for (const entry of Array.isArray(attendanceHistory) ? attendanceHistory : []) {
      const date = new Date(entry.timestamp);
      if (!clientIds.has(entry.clientId) || Number.isNaN(date.getTime())) continue;
      const day = dayCounts.get(localDateKey(date));
      if (day) day.count += 1;
    }

    const totalAtendimentos = clients.reduce(
      (sum, client) => sum + (Number.isInteger(client.atendimentos) && client.atendimentos > 0 ? client.atendimentos : 0),
      0
    );
    const totalClientesAtendidos = byClient.length;
    const mediaDiaria = Number((days.reduce((sum, day) => sum + day.count, 0) / days.length).toFixed(1));

    return { totalAtendimentos, totalClientesAtendidos, mediaDiaria, byClient, days };
  }

  const api = Object.freeze({ calculate });
  global.CrmMetrics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
