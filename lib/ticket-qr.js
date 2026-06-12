'use strict';

const QRCode = require('qrcode');

// 门票二维码存档统一参数：与 /api/qr 实时渲染保持同款式样（深紫码点、白底、H 级纠错）
var QR_ARCHIVE_OPTIONS = {
  type: 'png',
  width: 512,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#1a1033',
    light: '#ffffff'
  }
};

async function generateTicketQrBase64(verifyUrl) {
  var url = String(verifyUrl || '').trim();
  if (!url) return '';
  var png = await QRCode.toBuffer(url, QR_ARCHIVE_OPTIONS);
  return png.toString('base64');
}

module.exports = {
  generateTicketQrBase64
};
