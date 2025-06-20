document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const baseUrlInput = document.getElementById('baseUrl');

  chrome.storage.sync.get(['enabled', 'baseUrl'], ({ enabled = true, baseUrl = '' }) => {
    toggle.checked = enabled;
    baseUrlInput.value = baseUrl;
  });

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({
      enabled: toggle.checked
    });
  });

  baseUrlInput.addEventListener('input', () => {
    chrome.storage.sync.set({
      baseUrl: baseUrlInput.value.trim()
    });
  });

  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  const versionSpan = document.getElementById('plugin-version');
  if (versionSpan) {
    versionSpan.textContent = `v${version}`;
  }
});