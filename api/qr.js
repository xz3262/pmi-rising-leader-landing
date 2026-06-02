const QRCode = require('qrcode');
const { json } = require('./lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var data = String(req.query.data || '').trim();
  if (!data || data.length > 2000) {
    return json(res, 400, { error: '缺少二维码内容' });
  }

  try {
    var width = parseInt(req.query.w || req.query.width || '512', 10);
    if (!Number.isFinite(width) || width < 200) width = 512;
    if (width > 1024) width = 1024;

    var png = await QRCode.toBuffer(data, {
      type: 'png',
      width: width,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1a1033',
        light: '#ffffff'
      }
    });

    res.status(200);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.end(png);
  } catch (err) {
    console.error('[qr] error', err);
    return json(res, 500, { error: '二维码生成失败' });
  }
};
