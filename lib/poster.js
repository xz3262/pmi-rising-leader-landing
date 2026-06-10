'use strict';

/* =========================================================
   lib/poster.js — 调用 OpenRouter (Gemini 2.5 Flash Image /
   Nano Banana) 把获奖者上传的照片转成「自然肤色 + 紫色渐变背景」
   的海报人像。生产端点 api/poster.js 与本地工具 tools/poster-gen.js
   共用此模块，保证提示词与逻辑一致。
   ========================================================= */

const { env } = require('./zpay');

const POSTER_MODEL = 'google/gemini-2.5-flash-image';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 锁定的生产提示词（与 tools/prompt-final.txt 保持一致）
const POSTER_PROMPT = [
  'Using the SAME person from the provided photo: keep their exact facial identity — same face shape, eyes, nose, mouth, eyebrows, hairstyle, glasses (if any) and skin — clearly recognizable as the same individual. Do NOT change or beautify the face. Keep their natural expression.',
  '',
  'VERY IMPORTANT: keep the person\'s skin and face in NATURAL, normal, healthy color, exactly like a real photograph. Do NOT tint the skin or face purple. Light the person with soft, even, neutral studio lighting (normal white light) so they look like a real corporate headshot with true-to-life skin tones.',
  '',
  'Reframe to a clean, TIGHT head-and-shoulders portrait, square 1:1: the head should be large and prominent in the upper-middle of the frame, with only a small margin of background above the hair, cropped at the upper chest / shoulders. If the original photo is a wider, distant or full-body shot, zoom and crop in to this consistent head-and-shoulders framing. Person centered, facing the camera, confident and professional.',
  '',
  'Replace ONLY the background with a smooth, clean, silky purple-to-violet gradient — elegant and minimal, with a soft gentle glow. NO fabric folds, NO curtain wrinkles, NO drapery, no heavy texture. Just a smooth premium purple studio backdrop. Only the background is purple; the person stays naturally colored.',
  '',
  'No text, no logos, no watermarks. Photorealistic, sharp, professional magazine quality.'
].join('\n');

/* 从 OpenRouter 响应中尽力提取生成图片的 data URL */
function extractImageDataUrl(data) {
  try {
    var msg = data && data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) return null;
    if (Array.isArray(msg.images)) {
      for (var i = 0; i < msg.images.length; i++) {
        var im = msg.images[i];
        var url = im && (im.image_url ? im.image_url.url : im.url);
        if (url && /^data:image\//.test(url)) return url;
      }
    }
    if (Array.isArray(msg.content)) {
      for (var j = 0; j < msg.content.length; j++) {
        var c = msg.content[j];
        var u = c && c.image_url ? c.image_url.url : null;
        if (u && /^data:image\//.test(u)) return u;
      }
    }
    var raw = JSON.stringify(data);
    var mm = raw.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (mm) return mm[0];
  } catch (e) {}
  return null;
}

/* 仅允许常见图片 mime，其余归一为 image/png，避免畸形 data URL */
function sanitizeImageMime(mime) {
  var m = String(mime || '').trim().toLowerCase();
  if (m === 'image/jpg' || m === 'image/jpeg') return 'image/jpeg';
  if (m === 'image/png') return 'image/png';
  if (m === 'image/webp') return 'image/webp';
  return 'image/png';
}

/* 把 data URL 拆成 { mime, base64 } */
function splitDataUrl(dataUrl) {
  var m = String(dataUrl || '').match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  return { mime: sanitizeImageMime(m[1]), base64: m[2] };
}

/*
  生成海报人像。
  输入: photoDataUrl —— 形如 data:image/jpeg;base64,xxxx 的用户照片
  返回: { mime, base64, usage } —— 生成的紫色人像
  失败抛出 Error。
*/
async function generatePosterPortrait(photoDataUrl, opts) {
  opts = opts || {};
  var apiKey = env('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('缺少 OPENROUTER_API_KEY');
  if (!/^data:image\//.test(String(photoDataUrl || ''))) {
    throw new Error('无效的照片数据');
  }

  var body = {
    model: opts.model || POSTER_MODEL,
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: '1:1' },
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: photoDataUrl } },
        { type: 'text', text: POSTER_PROMPT }
      ]
    }]
  };

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, opts.timeoutMs || 55000);
  var res, text;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': env('SITE_URL') || 'https://www.rising2026.com',
        'X-Title': 'PMI Rising Leader Poster'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    text = await res.text();
  } catch (err) {
    if (err && err.name === 'AbortError') throw new Error('生成超时，请稍后重试');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  var data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('生成服务响应异常 (HTTP ' + (res ? res.status : '?') + ')');
  }
  if (!res.ok) {
    var em = (data && data.error && (data.error.message || data.error)) || ('HTTP ' + res.status);
    throw new Error('生成服务报错：' + String(em).slice(0, 200));
  }

  var dataUrl = extractImageDataUrl(data);
  var parts = dataUrl ? splitDataUrl(dataUrl) : null;
  if (!parts) {
    // 模型只回了文字未回图：通常是判定照片中没有可用的真人人像（如截图/卡通/logo）
    var reply = data && data.choices && data.choices[0] && data.choices[0].message;
    var textReply = reply && typeof reply.content === 'string' ? reply.content.trim() : '';
    if (textReply) {
      throw new Error('未能从照片中识别出人像，请上传清晰的真人正脸照片后重试');
    }
    throw new Error('生成失败，未返回图片');
  }
  return { mime: parts.mime, base64: parts.base64, usage: data.usage };
}

module.exports = {
  POSTER_MODEL,
  POSTER_PROMPT,
  extractImageDataUrl,
  splitDataUrl,
  generatePosterPortrait
};
