const { insertNominee } = require('../lib/db');
const { parseBody, json, requestMeta } = require('../lib/http');

function validateNominee(body) {
  var errors = [];
  if (!body.name || !String(body.name).trim()) errors.push('请填写姓名');
  if (!body.company || !String(body.company).trim()) errors.push('请填写公司');
  if (!body.title || !String(body.title).trim()) errors.push('请填写职务');
  if (!/^1\d{10}$/.test(String(body.phone || '').trim())) errors.push('请填写正确手机号');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim())) errors.push('请填写正确邮箱');
  if (!body.address || !String(body.address).trim()) errors.push('请填写收件地址');
  if (body.photo_base64 && String(body.photo_base64).length > 4000000) {
    errors.push('照片过大，请换一张较小的图片');
  }
  return errors;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var body = parseBody(req);
  if (!body) return json(res, 400, { error: '请求格式错误' });

  var errors = validateNominee(body);
  if (errors.length) return json(res, 400, { error: errors[0] });

  var meta = requestMeta(req);

  try {
    var id = await insertNominee({
      name: String(body.name).trim(),
      nickname: String(body.nickname || '').trim(),
      company: String(body.company).trim(),
      title: String(body.title).trim(),
      phone: String(body.phone).trim(),
      email: String(body.email).trim(),
      wechat: String(body.wechat || '').trim(),
      address: String(body.address).trim(),
      photo_mime: String(body.photo_mime || '').trim(),
      photo_base64: String(body.photo_base64 || '').trim(),
      client_ip: meta.clientIp,
      user_agent: meta.userAgent
    });
    return json(res, 200, { ok: true, id: id });
  } catch (err) {
    console.error('[nominee] insert failed', err);
    return json(res, 500, { error: '提交失败，请稍后重试' });
  }
};
