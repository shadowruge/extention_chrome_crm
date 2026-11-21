const openPanelBtn = document.getElementById('openPanelBtn');
const popupNotice = document.getElementById('popupNotice');
let panelOptions;

function showPanelError(error) {
  popupNotice.textContent = `Nao foi possivel abrir o painel: ${error.message}`;
  popupNotice.hidden = false;
}

if (typeof chrome !== 'undefined' && chrome.sidePanel?.open && chrome.windows?.getCurrent) {
  openPanelBtn.disabled = true;
  chrome.windows.getCurrent()
    .then(currentWindow => {
      panelOptions = { windowId: currentWindow.id };
      openPanelBtn.disabled = false;
    })
    .catch(showPanelError);
}

openPanelBtn.addEventListener('click', () => {
  let opening;
  try {
    opening = openCrmPanel(panelOptions);
  } catch (error) {
    showPanelError(error);
    return;
  }

  Promise.resolve(opening)
    .then(() => window.close())
    .catch(showPanelError);
});
