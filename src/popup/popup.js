document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const baseUrlInput = document.getElementById('baseUrl');
  const overrideBaseUrlCheckbox = document.getElementById('overrideBaseUrl');

  chrome.storage.sync.get(['enabled', 'baseUrl', 'overrideBaseUrl'], ({ enabled = true, baseUrl = '', overrideBaseUrl = false }) => {
    toggle.checked = enabled;
    baseUrlInput.value = baseUrl;
    overrideBaseUrlCheckbox.checked = overrideBaseUrl;
    renderQR(baseUrlInput.value.trim());
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      enabled: toggle.checked
    });
  });

  overrideBaseUrlCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({
      overrideBaseUrl: overrideBaseUrlCheckbox.checked
    });
  });

  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  const versionSpan = document.getElementById('plugin-version');
  if (versionSpan) {
    versionSpan.textContent = `v${version}`;
  }

  // Генерация QR-кода
  const qrDiv = document.getElementById('qrcode');
  function renderQR(url) {
    if (!qrDiv) return;
    qrDiv.innerHTML = '';
    if (url) {
      new QRCode(qrDiv, {
        text: url,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  baseUrlInput.addEventListener('input', () => {
    chrome.storage.sync.set({
      baseUrl: baseUrlInput.value.trim()
    });
    renderQR(baseUrlInput.value.trim());
  });
});