const { getNomineeForPoster, saveNomineePoster, getNomineePosterState, saveNomineeFinalPoster } = require('../lib/db');
const { generatePosterPortrait } = require('../lib/poster');
const { parseBody, json } = require('../lib/http');
const { adminKeyOk, nomineePosterTokenOk } = require('../lib/admin');

// 同一容器内对同一 id 的并发生成去重（共享同一 Promise），避免重复调用 AI
var inFlight = {};

// 最终合成海报回传存档：解析 dataURL，校验类型与大小
var FINAL_POSTER_MAX_B64 = 4000000; // 与照片上限一致，约 3MB 原始数据
function parseFinalPosterDataUrl(raw) {
  var m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(raw || ''));
  if (!m) return null;
  if (m[2].length > FINAL_POSTER_MAX_B64) return null;
  return { mime: m[1], base64: m[2] };
}

// 浏览器合成的最终海报（人像+模板）回传 → 存档。
// 鉴权：提交者凭随 id 下发的 token，管理端凭 admin key（可 force 覆盖纠错）；首写优先
async function handleArchiveFinalPoster(req, res, id, body) {
  var isAdmin = adminKeyOk(req);
  if (!isAdmin && !nomineePosterTokenOk(id, body.token)) {
    return json(res, 403, { error: '无存档权限' });
  }
  var force = isAdmin && body.force === true;

  var parsed = parseFinalPosterDataUrl(body.finalPoster);
  if (!parsed) return json(res, 400, { error: '海报数据无效或过大' });

  var state;
  try {
    state = await getNomineePosterState(id);
  } catch (err) {
    console.error('[poster] read state failed', err);
    return json(res, 500, { error: '读取失败，请稍后重试' });
  }
  if (!state) return json(res, 404, { error: '记录不存在' });
  if (Number(state.has_final_poster) === 1 && !force) {
    return json(res, 200, { ok: true, archived: true, cached: true });
  }

  try {
    await saveNomineeFinalPoster(id, parsed.base64, parsed.mime, force);
  } catch (err) {
    console.error('[poster] archive failed', err);
    return json(res, 500, { error: '存档失败，请稍后重试' });
  }
  return json(res, 200, { ok: true, archived: true, cached: false });
}

/*
  POST /api/poster  { id }
  - 按 nominee id 取上传照片 → 调 Gemini 生成「自然肤色+紫色背景」人像
  - 结果存入 Turso（poster_base64）；若已生成则直接返回（每人只生成一次）
  - 返回 { ok, posterDataUrl, cached }

  POST /api/poster  { id, finalPoster, token }   （管理端：X-Nominee-Admin-Key 头 + 可选 force）
  - 浏览器把「人像+模板」合成后的最终海报回传存档（final_poster_base64）
  - token 为提名提交成功时随 id 下发的存档令牌；返回 { ok, archived, cached }
*/
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var body = parseBody(req);
  var id = body ? Number(body.id || 0) : 0;
  if (!id || id < 1) return json(res, 400, { error: '缺少有效的 id' });

  if (body.finalPoster) {
    return handleArchiveFinalPoster(req, res, id, body);
  }

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
