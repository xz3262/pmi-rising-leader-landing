const { insertBarrageMessage } = require('../lib/db');
const { parseBody, json, requestMeta } = require('../lib/http');

function validateBarrage(body) {
  var errors = [];
  var content = String(body.content || '').trim();
  if (!content) errors.push('请填写内容');
  if (content.length > 50) errors.push('内容不能超过 50 字');
  if (!body.agreed_terms) errors.push('请先同意发布说明');
  return errors;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var body = parseBody(req);
  if (!body) return json(res, 400, { error: '请求格式错误' });

  var errors = validateBarrage(body);
  if (errors.length) return json(res, 400, { error: errors[0] });

  var meta = requestMeta(req);

  try {
    var id = await insertBarrageMessage({
      content: String(body.content).trim(),
      agreed_terms: !!body.agreed_terms,
      client_ip: meta.clientIp,
      user_agent: meta.userAgent
    });
    return json(res, 200, { ok: true, id: id });
  } catch (err) {
    console.error('[barrage] insert failed', err);
    return json(res, 500, { error: '发送失败，请稍后重试' });
  }
};
