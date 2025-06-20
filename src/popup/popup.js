document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const baseUrlInput = document.getElementById('baseUrl');

  chrome.storage.sync.get(['enabled', 'baseUrl'], ({ enabled = true, baseUrl = '' }) => {
    toggle.checked = enabled;
    baseUrlInput.value = baseUrl;
    renderQR(baseUrlInput.value.trim());
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      enabled: toggle.checked
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