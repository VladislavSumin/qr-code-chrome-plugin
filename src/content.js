const PATH_REGEX = /(https?:\/\/[^\s"'<>]+)|(?:\b|\/)(?:[a-z0-9\-._~!$&'()*+,;=:@]+)(?:\/[a-z0-9\-._~!$&'()*+,;=:@]+)*(\?[a-z0-9\-._~!$&'()*+,;=:@%&=+]*|)/gi;
let qrLibLoaded = false;
let isEnabled = false;

// Загрузка библиотеки QRCode
function loadQRCodeLib(callback) {
  if (qrLibLoaded) {
    callback();
    return;
  }

  if (typeof QRCode !== 'undefined') {
    qrLibLoaded = true;
    callback();
    return;
  }

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('qrcode.min.js');
  script.onload = () => {
    qrLibLoaded = true;
    callback();
  };
  script.onerror = () => console.error('Failed to load QRCode library');
  document.head.appendChild(script);
}

function createQRPopup(url, x, y) {
  const existing = document.getElementById('qr-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'qr-popup';
  popup.style.cssText = `
    position: absolute;
    z-index: 999999;
    background: white;
    padding: 10px;
    border: 1px solid #ccc;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 270px;
  `;

  const qrContainer = document.createElement('div');
  qrContainer.id = 'qr-code';
  qrContainer.style.cssText = 'width: 192px; height: 192px; margin: 0 auto;';
  popup.appendChild(qrContainer);

  // Добавляем контейнер для URL
  const urlContainer = document.createElement('div');
  urlContainer.id = 'qr-url';
  urlContainer.style.cssText = 'margin-top: 10px; word-break: break-all; font-size: 12px; color: #333; text-align: center; max-width: 250px;';
  urlContainer.textContent = url;
  popup.appendChild(urlContainer);
  
  document.body.appendChild(popup);
  
  const rect = popup.getBoundingClientRect();
  popup.style.left = `${Math.min(x, window.innerWidth - rect.width - 10)}px`;
  popup.style.top = `${Math.min(y, window.innerHeight - rect.height - 10)}px`;

  try {
    new URL(url);
    
    loadQRCodeLib(() => {
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
          text: url,
          width: 192,
          height: 192,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        qrContainer.innerHTML = `<div style="width:192px;height:192px;display:flex;align-items:center;justify-content:center;color:red;font-size:12px;">
          QR lib not loaded
        </div>`;
      }
    });
  } catch (e) {
    qrContainer.innerHTML = `<div style="width:192px;height:192px;display:flex;align-items:center;justify-content:center;color:red;font-size:12px;">
      Invalid URL
    </div>`;
  }
}

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
      createQRPopup(fullUrl, e.pageX + 15, e.pageY + 15);
    } catch (error) {
      console.error("Error creating QR code:", error);
    }
  });
}

function handleMouseLeave(e) {
  const target = e.target;
  const popup = document.getElementById('qr-popup');
  if (popup) popup.remove();
  
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
      document.querySelectorAll('#qr-popup').forEach(el => el.remove());
      removeAllQRPaths(); // Удаляем все подсвеченные ссылки
    } else {
      scanForPaths();
    }
  }
  
  if ('baseUrl' in changes) {
    scanForPaths();
  }
});