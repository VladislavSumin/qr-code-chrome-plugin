// Функция создания popup с QR-кодом
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
      qrContainer.innerHTML = `<div style=\"width:192px;height:192px;display:flex;align-items:center;justify-content:center;color:red;font-size:12px;\">\n        QR lib not loaded\n      </div>`;
    }
  } catch (e) {
    qrContainer.innerHTML = `<div style=\"width:192px;height:192px;display:flex;align-items:center;justify-content:center;color:red;font-size:12px;\">\n      Invalid URL\n    </div>`;
  }
}

// Функция удаления popup с QR-кодом
function removeQRPopup() {
  const popup = document.getElementById('qr-popup');
  if (popup) popup.remove();
}

window.createQRPopup = createQRPopup;
window.removeQRPopup = removeQRPopup; 