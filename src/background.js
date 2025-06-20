chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true, baseUrl: "https://example.com/" });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-feature") {
    chrome.storage.sync.get("enabled", ({ enabled }) => {
      chrome.storage.sync.set({ enabled: !enabled });
    });
  }
});