const PATH_REGEX = /(https?:\/\/[^\s"'<>]+)|(?:\b|\/)(?:[a-z0-9\-._~!$&'()*+,;=:@]+)(?:\/[a-z0-9\-._~!$&'()*+,;=:@]+)*(\?[a-z0-9\-._~!$&'()*+,;=:@%&=+]*|)/gi;
let isEnabled = false;

// Функция для добавления обработчиков только к новым элементам
function attachListenersToNewElements() {
  document.querySelectorAll('.qr-path:not([data-has-listener])').forEach(el => {
    el.setAttribute('data-has-listener', 'true');
    
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('click', handleClick);
  });
}

function handleMouseEnter(e) {
  const target = e.target;
  chrome.storage.sync.get(['baseUrl'], ({ baseUrl = '' }) => {
    const path = target.textContent.trim();
    
    try {
      let fullUrl;
      if (/^https?:\/\//i.test(path)) {
        fullUrl = path;
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

function handleClick(e) {
  const target = e.target;
  const path = target.textContent.trim();
  navigator.clipboard.writeText(path).then(() => {
    target.style.borderColor = 'green';
    setTimeout(() => {
      target.style.borderColor = '#666';
    }, 1000);
  });
}

// Основная функция сканирования
function scanForPaths() {
  if (!isEnabled) return;

  const walker = document.createTreeWalker(
    document.body,
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
    const content = node.textContent;

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
        wrapper.title = `Click to copy: ${path}`;
        range.surroundContents(wrapper);
      } catch (e) {
        console.warn("Could not wrap path", e);
      }
    }
  }

  attachListenersToNewElements();
}

// Функция для удаления всех подсвеченных ссылок
function removeAllQRPaths() {
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
  scanForPaths();
});

// Оптимизированный MutationObserver
const observer = new MutationObserver(mutations => {
  let needsScan = false;
  
  for (const mutation of mutations) {
    // Игнорируем изменения в наших qr-элементах
    if (mutation.target.classList?.contains('qr-path')) continue;
    
    // Игнорируем изменения атрибутов и характеристик
    if (mutation.type === 'attributes') continue;
    
    needsScan = true;
    break;
  }
  
  if (needsScan && isEnabled) {
    scanForPaths();
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
    if (!isEnabled) {
      window.removeQRPopup();
      removeAllQRPaths(); // Удаляем все подсвеченные ссылки
    } else {
      scanForPaths();
    }
  }
  
  if ('baseUrl' in changes) {
    scanForPaths();
  }
});