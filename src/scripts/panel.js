async function openCrmPanel(tabId) {
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ tabId });
    return;
  }

  if (typeof browser !== 'undefined' && browser.sidebarAction?.open) {
    await browser.sidebarAction.open();
    return;
  }

  throw new Error('Este navegador nao oferece suporte ao painel lateral da extensao');
}
