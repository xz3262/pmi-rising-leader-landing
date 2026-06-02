'use strict';

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

module.exports = {
  getAdminKeyFromRequest,
  adminKeyOk,
  adminSecretConfigured
};
