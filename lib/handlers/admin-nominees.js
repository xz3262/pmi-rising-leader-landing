'use strict';

const { listNomineesBrief, getNomineeById, getNomineeDetailLite } = require('../db');
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
    attendCeremony: String(row.attend_ceremony || ''),
    acceptInterview: String(row.accept_interview || ''),
    interviewCity: String(row.interview_city || ''),
    acceptCeremonyInterview: String(row.accept_ceremony_interview || ''),
    abilityTag: String(row.ability_tag || ''),
    authAgreed: Number(row.auth_agreed) === 1,
    hasPhoto: Number(row.has_photo) === 1,
    hasPoster: Number(row.has_poster) === 1,
    photoMime: String(row.photo_mime || ''),
    createdAt: formatStoredChina(row.created_at)
  };
}

function detailCommon(row) {
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
    attendCeremony: String(row.attend_ceremony || ''),
    acceptInterview: String(row.accept_interview || ''),
    interviewCity: String(row.interview_city || ''),
    acceptCeremonyInterview: String(row.accept_ceremony_interview || ''),
    proudDecision: String(row.proud_decision || ''),
    complexProblem: String(row.complex_problem || ''),
    oneLineIntro: String(row.one_line_intro || ''),
    abilityTag: String(row.ability_tag || ''),
    authAgreed: Number(row.auth_agreed) === 1,
    createdAt: formatStoredChina(row.created_at)
  };
}

// 默认详情：只带缩略图（几十 KB），原图/海报按需用 full=1 拉取
function rowToDetailLite(row) {
  var thumbB64 = String(row.photo_thumb_base64 || '').trim();
  return Object.assign(detailCommon(row), {
    hasPhoto: Number(row.has_photo) === 1,
    hasPoster: Number(row.has_poster) === 1,
    thumbDataUrl: thumbB64 ? 'data:image/jpeg;base64,' + thumbB64 : ''
  });
}

function rowToDetailFull(row) {
  var mime = String(row.photo_mime || '').trim() || 'image/jpeg';
  var b64 = String(row.photo_base64 || '').trim();
  var posterMime = String(row.poster_mime || '').trim() || 'image/png';
  var posterB64 = String(row.poster_base64 || '').trim();
  var thumbB64 = String(row.photo_thumb_base64 || '').trim();
  return Object.assign(detailCommon(row), {
    hasPhoto: Boolean(b64),
    photoMime: mime,
    photoDataUrl: b64 ? 'data:' + mime + ';base64,' + b64 : '',
    hasPoster: Boolean(posterB64),
    posterDataUrl: posterB64 ? 'data:' + posterMime + ';base64,' + posterB64 : '',
    thumbDataUrl: thumbB64 ? 'data:image/jpeg;base64,' + thumbB64 : ''
  });
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
      var wantFull = String(req.query.full || '') === '1';
      if (wantFull) {
        var fullRow = await getNomineeById(id);
        if (!fullRow) return json(res, 404, { error: '记录不存在' });
        return json(res, 200, { ok: true, nominee: rowToDetailFull(fullRow) });
      }
      var row = await getNomineeDetailLite(id);
      if (!row) return json(res, 404, { error: '记录不存在' });
      return json(res, 200, { ok: true, nominee: rowToDetailLite(row) });
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
