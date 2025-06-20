document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const baseUrlInput = document.getElementById('baseUrl');
  const saveBtn = document.getElementById('save');

  chrome.storage.sync.get(['enabled', 'baseUrl'], ({ enabled = true, baseUrl = '' }) => {
    toggle.checked = enabled;
    baseUrlInput.value = baseUrl;
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.sync.set({
      enabled: toggle.checked,
      baseUrl: baseUrlInput.value.trim()
    }, () => {
      alert('Settings saved!');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });
});