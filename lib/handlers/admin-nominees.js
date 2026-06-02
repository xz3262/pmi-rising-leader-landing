'use strict';

const { listNomineesBrief, getNomineeById } = require('../db');
const { json } = require('../http');
const { formatStoredChina } = require('../time');
const { adminKeyOk, adminSecretConfigured } = require('../admin');

function rowToBrief(row) {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    nickname: String(row.nickname || ''),
    company: String(row.company || ''),
    title: String(row.title || ''),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    wechat: String(row.wechat || ''),
    address: String(row.address || ''),
    hasPhoto: Number(row.has_photo) === 1,
    photoMime: String(row.photo_mime || ''),
    createdAt: formatStoredChina(row.created_at)
  };
}

function rowToDetail(row) {
  var mime = String(row.photo_mime || '').trim() || 'image/jpeg';
  var b64 = String(row.photo_base64 || '').trim();
  var photoDataUrl = b64 ? 'data:' + mime + ';base64,' + b64 : '';
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    nickname: String(row.nickname || ''),
    company: String(row.company || ''),
    title: String(row.title || ''),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    wechat: String(row.wechat || ''),
    address: String(row.address || ''),
    hasPhoto: Boolean(b64),
    photoMime: mime,
    photoDataUrl: photoDataUrl,
    createdAt: formatStoredChina(row.created_at)
  };
}

module.exports = async function handleAdminNominees(req, res) {
  if (!adminSecretConfigured()) {
    return json(res, 503, { error: '未配置访问密钥，请在环境变量设置 NOMINEE_ADMIN_SECRET' });
  }
  if (!adminKeyOk(req)) {
    return json(res, 401, { error: '密钥无效或未提供' });
  }

  try {
    var id = Number(req.query.id || 0);
    if (id > 0) {
      var row = await getNomineeById(id);
      if (!row) return json(res, 404, { error: '记录不存在' });
      return json(res, 200, { ok: true, nominee: rowToDetail(row) });
    }

    var rows = await listNomineesBrief();
    return json(res, 200, {
      ok: true,
      nominees: rows.map(rowToBrief)
    });
  } catch (err) {
    console.error('[admin/nominees] read failed', err);
    return json(res, 500, { error: '读取失败，请稍后重试' });
  }
};
