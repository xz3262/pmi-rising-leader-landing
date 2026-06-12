'use strict';

const crypto = require('crypto');
const { env } = require('./zpay');

function getAdminKeyFromRequest(req) {
  return String(req.query.key || req.headers['x-nominee-admin-key'] || '').trim();
}

function adminKeyOk(req) {
  var secret = env('NOMINEE_ADMIN_SECRET');
  if (!secret) return false;
  var key = getAdminKeyFromRequest(req);
  return key.length > 0 && key === secret;
}

function adminSecretConfigured() {
  return Boolean(env('NOMINEE_ADMIN_SECRET'));
}

// 海报存档令牌：提名提交成功时随 id 下发给提交者本人，回传存档时校验，
// 防止任意人凭可枚举的 id 抢先写入伪造海报
function nomineePosterToken(id) {
  var secret = env('NOMINEE_ADMIN_SECRET');
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update('nominee-poster-' + String(id)).digest('hex');
}

function safeEqual(a, b) {
  var ab = Buffer.from(String(a || ''));
  var bb = Buffer.from(String(b || ''));
  if (!ab.length || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function nomineePosterTokenOk(id, token) {
  var expected = nomineePosterToken(id);
  return Boolean(expected) && safeEqual(token, expected);
}

module.exports = {
  getAdminKeyFromRequest,
  adminKeyOk,
  adminSecretConfigured,
  nomineePosterToken,
  nomineePosterTokenOk
};
