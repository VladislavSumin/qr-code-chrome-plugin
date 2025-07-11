const PATH_REGEX = /https?:\/\/[\S"'<>]+|\/[\S"'<>]*/g;
const LOG_TAG = '[QR-Plugin]';
let isEnabled = false;

// Список тегов, которые нужно игнорировать при обработке текстовых нод
const IGNORED_TAGS = ['STYLE', 'SCRIPT', 'SVG', 'META', 'NOSCRIPT', 'OPTION', 'TEXTAREA'];

function isTextNodeValid(node) {
  if (!node.parentElement) return false;
  if (IGNORED_TAGS.includes(node.parentElement.tagName)) return false;
  return true;
}

// Функция для добавления обработчиков только к новым элементам
function attachListenersToNewElements() {
  document.querySelectorAll('.qr-path:not([data-has-listener])').forEach(el => {
    el.setAttribute('data-has-listener', 'true');
    
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
  });
}

function handleMouseEnter(e) {
  const target = e.target;
  chrome.storage.sync.get(['baseUrl', 'overrideBaseUrl'], ({ baseUrl = '', overrideBaseUrl = false }) => {
    const path = target.textContent.trim();
    try {
      let fullUrl;
      if (/^https?:\/\//i.test(path)) {
        if (overrideBaseUrl && baseUrl) {
          // Заменяем схему и хост на baseUrl
          try {
            const urlObj = new URL(path);
            const baseObj = new URL(baseUrl);
            fullUrl = baseObj.origin + urlObj.pathname + urlObj.search + urlObj.hash;
          } catch (err) {
            fullUrl = path; // fallback
          }
        } else {
          fullUrl = path;
        }
      } else {
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        fullUrl = `${base}${cleanPath}`;
      }
      target.dataset.originalTitle = target.title || '';
      target.title = '';
      window.createQRPopup(fullUrl, e.pageX + 15, e.pageY + 15);
    } catch (error) {
      console.error("Error creating QR code:", error);
    }
  });
}

function handleMouseLeave(e) {
  const target = e.target;
  window.removeQRPopup();
  if (target.dataset.originalTitle) {
    target.title = target.dataset.originalTitle;
  }
}

// Основная функция сканирования для указанного корня
function scanForPathsIn(root) {
  if (!isEnabled) return;

  let nodeCount = 0;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: node => 
        node.parentElement?.classList?.contains('qr-path') ? 
          NodeFilter.FILTER_REJECT : 
          NodeFilter.FILTER_ACCEPT
    },
    false
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!isTextNodeValid(node)) continue;
    const content = node.textContent;
    nodeCount++;

    // Сначала собираем все совпадения
    let matches = [];
    let match;
    PATH_REGEX.lastIndex = 0;
    while ((match = PATH_REGEX.exec(content)) !== null) {
      const path = match[0];
      matches.push({
        start: match.index,
        end: match.index + path.length,
        path
      });
    }

    // Оборачиваем с конца, чтобы не сбивать индексы
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, path } = matches[i];
      const range = document.createRange();
      try {
        range.setStart(node, start);
        range.setEnd(node, end);
        if (range.toString() !== path) continue;
        const wrapper = document.createElement('span');
        wrapper.className = 'qr-path';
        wrapper.style.cssText = 'border-bottom: 1px dashed #666; cursor: pointer;';
        range.surroundContents(wrapper);
        console.log(`${LOG_TAG} Добавлен спан для ссылки:`, path);
      } catch (e) {
        console.warn("Could not wrap path", e);
      }
    }
  }

  attachListenersToNewElements();
  console.log(`${LOG_TAG} Обработано текстовых нод: ${nodeCount}`);
}

// Функция для удаления всех подсвеченных ссылок
function removeAllQRPaths() {
  console.log(`${LOG_TAG} Удаление всех подсвеченных ссылок`);
  document.querySelectorAll('.qr-path').forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;
    // Заменяем span на его текстовое содержимое
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize && parent.normalize();
  });
}

// Инициализация
chrome.storage.sync.get(['enabled'], ({ enabled = true }) => {
  isEnabled = enabled;
  scanForPathsIn(document.body);
});

// Оптимизированный MutationObserver
const observer = new MutationObserver(mutations => {
  if (!isEnabled) return;
  console.log(`${LOG_TAG} MutationObserver triggered, mutations: ${mutations.length}`);
  let processed = new Set();
  for (const mutation of mutations) {
    // Игнорируем изменения в наших qr-элементах
    if (mutation.target.classList?.contains('qr-path')) continue;
    // Игнорируем изменения атрибутов и характеристик
    if (mutation.type === 'attributes') continue;
    // Для добавленных нод
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!processed.has(node)) {
            scanForPathsIn(node);
            processed.add(node);
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          if (!processed.has(node.parentNode)) {
            scanForPathsIn(node.parentNode);
            processed.add(node.parentNode);
          }
        }
      });
    } else {
      // Для изменений текста или других случаев
      if (!processed.has(mutation.target)) {
        scanForPathsIn(mutation.target);
        processed.add(mutation.target);
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Реакция на изменения настроек
chrome.storage.onChanged.addListener(changes => {
  if ('enabled' in changes) {
    isEnabled = changes.enabled.newValue;
    console.log(`${LOG_TAG} Статус изменен на: ${isEnabled}`);
    if (!isEnabled) {
      window.removeQRPopup();
      removeAllQRPaths(); // Удаляем все подсвеченные ссылки
    } else {
      scanForPathsIn(document.body);
    }
  }
  
  if ('baseUrl' in changes) {
    console.log(`${LOG_TAG} Базовый URL изменен на: ${changes.baseUrl.newValue}`);
    scanForPathsIn(document.body);
  }
});