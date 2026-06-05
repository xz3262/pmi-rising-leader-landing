const { getNomineeForPoster, saveNomineePoster } = require('../lib/db');
const { generatePosterPortrait } = require('../lib/poster');
const { parseBody, json } = require('../lib/http');

// 同一容器内对同一 id 的并发生成去重（共享同一 Promise），避免重复调用 AI
var inFlight = {};

/*
  POST /api/poster  { id }
  - 按 nominee id 取上传照片 → 调 Gemini 生成「自然肤色+紫色背景」人像
  - 结果存入 Turso（poster_base64）；若已生成则直接返回（每人只生成一次）
  - 返回 { ok, posterDataUrl, cached }
*/
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var body = parseBody(req);
  var id = body ? Number(body.id || 0) : 0;
  if (!id || id < 1) return json(res, 400, { error: '缺少有效的 id' });

  var row;
  try {
    row = await getNomineeForPoster(id);
  } catch (err) {
    console.error('[poster] read nominee failed', err);
    return json(res, 500, { error: '读取失败，请稍后重试' });
  }
  if (!row) return json(res, 404, { error: '记录不存在' });

  // 已生成过 → 直接返回（只生成一次）
  var existing = String(row.poster_base64 || '').trim();
  if (existing) {
    var existMime = String(row.poster_mime || '').trim() || 'image/png';
    return json(res, 200, {
      ok: true,
      cached: true,
      posterDataUrl: 'data:' + existMime + ';base64,' + existing
    });
  }

  var photoB64 = String(row.photo_base64 || '').trim();
  if (!photoB64) {
    return json(res, 422, { error: '未上传照片，无法生成海报', noPhoto: true });
  }
  var photoMime = String(row.photo_mime || '').trim() || 'image/jpeg';
  var photoDataUrl = 'data:' + photoMime + ';base64,' + photoB64;

  var key = String(id);
  if (!inFlight[key]) {
    inFlight[key] = (async function () {
      var r = await generatePosterPortrait(photoDataUrl);
      // 存库（失败不阻断返回，用户仍能看到海报）
      try {
        await saveNomineePoster(id, r.base64, r.mime);
      } catch (e) {
        console.error('[poster] save failed (non-fatal)', e);
      }
      return r;
    })().finally(function () { delete inFlight[key]; });
  }

  var result;
  try {
    result = await inFlight[key];
  } catch (err) {
    console.error('[poster] generate failed', err);
    return json(res, 502, { error: err.message || '海报生成失败，请稍后重试' });
  }

  return json(res, 200, {
    ok: true,
    cached: false,
    posterDataUrl: 'data:' + result.mime + ';base64,' + result.base64
  });
};
