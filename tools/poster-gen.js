#!/usr/bin/env node
/* =========================================================
   poster-gen.js — 调用 OpenRouter (Gemini 2.5 Flash Image / Nano Banana)
   生成「紫色海报人像」。既用于本地测试，其核心 generateImage()
   后续会被生产 API (/api/poster) 复用。

   用法：
     node tools/poster-gen.js --in <输入图|none> --prompt-file <txt> --out <png> [--aspect 1:1] [--model <id>]
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---- 极简 .env.local 解析（不引第三方依赖） ---- */
function loadEnvLocal() {
  var p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  var txt = fs.readFileSync(p, 'utf8');
  txt.split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function fileToDataUrl(file) {
  var ext = path.extname(file).toLowerCase();
  var mime = MIME_BY_EXT[ext] || 'image/jpeg';
  var b64 = fs.readFileSync(file).toString('base64');
  return 'data:' + mime + ';base64,' + b64;
}

/* ---- 从 OpenRouter 响应中尽力找出生成的图片 data URL ---- */
function extractImageDataUrl(data) {
  try {
    var msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) return null;
    // OpenRouter 标准：message.images[].image_url.url
    if (Array.isArray(msg.images)) {
      for (var i = 0; i < msg.images.length; i++) {
        var im = msg.images[i];
        var url = im && (im.image_url ? im.image_url.url : im.url);
        if (url && /^data:image\//.test(url)) return url;
      }
    }
    // 兜底：content 数组里可能带 image_url
    if (Array.isArray(msg.content)) {
      for (var j = 0; j < msg.content.length; j++) {
        var c = msg.content[j];
        var u = c && c.image_url ? c.image_url.url : null;
        if (u && /^data:image\//.test(u)) return u;
      }
    }
    // 兜底：在整段 JSON 里正则找 data:image base64
    var raw = JSON.stringify(data);
    var mm = raw.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (mm) return mm[0];
  } catch (e) {}
  return null;
}

/* ---- 核心：调用模型生成图片，返回 {dataUrl, usage, raw} ---- */
async function generateImage(opts) {
  var apiKey = opts.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('缺少 OPENROUTER_API_KEY');
  var model = opts.model || 'google/gemini-2.5-flash-image';

  var content = [];
  // 多张输入图（用于编辑/合成），按顺序放在 prompt 前
  (opts.inputDataUrls || []).forEach(function (u) {
    content.push({ type: 'image_url', image_url: { url: u } });
  });
  content.push({ type: 'text', text: opts.prompt });

  var body = {
    model: model,
    modalities: ['image', 'text'],
    messages: [{ role: 'user', content: content }]
  };
  if (opts.aspect) body.image_config = { aspect_ratio: opts.aspect };

  var res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'https://www.hazelabs.app',
      'X-Title': 'PMI Rising Leader Poster'
    },
    body: JSON.stringify(body)
  });

  var text = await res.text();
  var data;
  try { data = JSON.parse(text); } catch (e) {
    throw new Error('响应非 JSON (HTTP ' + res.status + '): ' + text.slice(0, 500));
  }
  if (!res.ok) {
    throw new Error('OpenRouter HTTP ' + res.status + ': ' + JSON.stringify(data.error || data).slice(0, 500));
  }

  var dataUrl = extractImageDataUrl(data);
  return { dataUrl: dataUrl, usage: data.usage, raw: data };
}

/* ---- CLI ---- */
function parseArgs(argv) {
  var a = {};
  for (var i = 2; i < argv.length; i++) {
    var k = argv[i];
    if (k.indexOf('--') === 0) { a[k.slice(2)] = argv[i + 1]; i++; }
  }
  return a;
}

function dataUrlToBuffer(dataUrl) {
  var b64 = dataUrl.split(',')[1] || '';
  return Buffer.from(b64, 'base64');
}

async function main() {
  loadEnvLocal();
  var a = parseArgs(process.argv);
  var prompt = a['prompt'];
  if (a['prompt-file']) prompt = fs.readFileSync(a['prompt-file'], 'utf8').trim();
  if (!prompt) throw new Error('需要 --prompt 或 --prompt-file');

  var inputs = [];
  if (a['in'] && a['in'] !== 'none') {
    a['in'].split(',').forEach(function (f) { inputs.push(fileToDataUrl(f.trim())); });
  }

  var out = a['out'] || 'tools/nominee-preview-out.png';
  console.log('模型:', a['model'] || 'google/gemini-2.5-flash-image', '| 输入图:', inputs.length, '| aspect:', a['aspect'] || '(默认)');
  var t0 = Date.now();
  var r = await generateImage({
    model: a['model'],
    prompt: prompt,
    inputDataUrls: inputs,
    aspect: a['aspect']
  });
  var secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('耗时:', secs + 's', '| usage:', JSON.stringify(r.usage || {}));

  if (!r.dataUrl) {
    var dump = out.replace(/\.[^.]+$/, '') + '.response.json';
    fs.writeFileSync(dump, JSON.stringify(r.raw, null, 2));
    console.error('未找到图片！已保存原始响应到', dump);
    process.exit(2);
  }
  var buf = dataUrlToBuffer(r.dataUrl);
  fs.writeFileSync(out, buf);
  console.log('已保存', out, '(' + Math.round(buf.length / 1024) + ' KB)');
}

if (require.main === module) {
  main().catch(function (e) { console.error('ERROR:', e.message); process.exit(1); });
}

module.exports = { generateImage, extractImageDataUrl, fileToDataUrl };
