const crypto = require('crypto');

const ZPAY_SUBMIT_URL = 'https://zpayz.cn/submit.php';
const ZPAY_MAPI_URL = 'https://zpayz.cn/mapi.php';

function signParams(params, key) {
  const keys = Object.keys(params)
    .filter(function (k) {
      return k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] != null;
    })
    .sort();

  const str = keys.map(function (k) { return k + '=' + params[k]; }).join('&') + key;
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

function verifySign(params, key) {
  const incoming = String(params.sign || '').toLowerCase();
  if (!incoming) return false;
  const expected = signParams(params, key);
  return incoming === expected;
}

function buildSubmitUrl(params) {
  const qs = Object.keys(params)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]));
    })
    .join('&');
  return ZPAY_SUBMIT_URL + '?' + qs;
}

function getClientIp(req) {
  var forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  if (req.headers['x-real-ip']) return String(req.headers['x-real-ip']);
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return '127.0.0.1';
}

function isMobileUa(ua) {
  return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua || '');
}

async function createMapiPayment(params, key) {
  var signed = Object.assign({}, params, {
    sign: signParams(params, key),
    sign_type: 'MD5'
  });

  var body = new URLSearchParams();
  Object.keys(signed).forEach(function (k) {
    body.append(k, String(signed[k]));
  });

  var res = await fetch(ZPAY_MAPI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  var data = await res.json();
  if (Number(data.code) !== 1) {
    throw new Error(data.msg || 'Z-Pay 创建订单失败');
  }
  return data;
}

async function queryZpayOrder(outTradeNo) {
  var pid = env('ZPAY_PID');
  var key = env('ZPAY_KEY');
  if (!pid || !key) return null;
  var url = 'https://zpayz.cn/api.php?act=order&pid=' + encodeURIComponent(pid) +
    '&key=' + encodeURIComponent(key) +
    '&out_trade_no=' + encodeURIComponent(outTradeNo);
  var res = await fetch(url);
  return res.json();
}

function env(name) {
  return String(process.env[name] || '').trim();
}

module.exports = {
  signParams,
  verifySign,
  buildSubmitUrl,
  getClientIp,
  isMobileUa,
  createMapiPayment,
  queryZpayOrder,
  env
};
