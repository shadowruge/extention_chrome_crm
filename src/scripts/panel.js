function openCrmPanel(options) {
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.open) {
    return chrome.sidePanel.open(options);
  }

  if (typeof browser !== 'undefined' && browser.sidebarAction?.open) {
    return browser.sidebarAction.open();
  }

  return Promise.reject(new Error('Este navegador nao oferece suporte ao painel lateral da extensao'));
}

function openCrmPanelFromCommand(tab) {
  if (tab?.id) return openCrmPanel({ tabId: tab.id });

  return chrome.tabs.query({ active: true, currentWindow: true })
    .then(([activeTab]) => openCrmPanel(activeTab?.id ? { tabId: activeTab.id } : undefined));
}

async function applyPanelSide(side) {
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.setLayout) {
    await chrome.sidePanel.setLayout({ side });
    return true;
  }

  return false;
}
