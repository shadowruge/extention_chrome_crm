document.getElementById('openPanelBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await openCrmPanel(tab.id);
      window.close();
    }
  } catch (error) {
    const notice = document.getElementById('popupNotice');
    notice.textContent = `Nao foi possivel abrir o painel: ${error.message}`;
    notice.hidden = false;
  }
});
