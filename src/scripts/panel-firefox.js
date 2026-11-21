function openCrmPanel() {
  if (typeof browser === 'undefined' || !browser.sidebarAction?.open) {
    return Promise.reject(new Error('Este navegador nao oferece suporte ao painel lateral da extensao'));
  }

  return browser.sidebarAction.open();
}

function openCrmPanelFromCommand() {
  return openCrmPanel();
}

function applyPanelSide() {
  return Promise.resolve(false);
}
