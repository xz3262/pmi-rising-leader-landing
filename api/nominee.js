const { insertNominee } = require('../lib/db');
const { parseBody, json, requestMeta } = require('../lib/http');

// 手机号：含国际号码，前端会拼成「+区号 号码」。位数不固定，
// 只要求可选 + 开头、5~20 位数字（去掉空格/连字符后）。
function isValidPhone(raw) {
  var s = String(raw || '').trim();
  if (!/^\+?[\d\s-]+$/.test(s)) return false;
  var digits = s.replace(/\D/g, '');
  return digits.length >= 5 && digits.length <= 20;
}

function isYesNo(v) {
  return v === '是' || v === '否';
}

function validateNominee(body) {
  var errors = [];
  if (!body.name || !String(body.name).trim()) errors.push('请填写姓名');
  if (!body.company || !String(body.company).trim()) errors.push('请填写公司');
  if (!body.title || !String(body.title).trim()) errors.push('请填写职务');
  if (!isValidPhone(body.phone)) errors.push('请填写正确手机号');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim())) errors.push('请填写正确邮箱');
  if (!body.address || !String(body.address).trim()) errors.push('请填写收件地址');
  if (!isYesNo(String(body.attend_ceremony || '').trim())) errors.push('请确认是否现场参加颁奖典礼并领奖');
  var interviewPre = String(body.accept_interview || '').trim();
  if (!isYesNo(interviewPre)) errors.push('请确认是否接受活动前期采访拍摄');
  if (interviewPre === '是' && (!body.interview_city || !String(body.interview_city).trim())) {
    errors.push('请填写所在城市');
  }
  if (!isYesNo(String(body.accept_ceremony_interview || '').trim())) errors.push('请确认是否接受典礼期间采访拍摄');
  if (body.auth_agreed !== true) errors.push('请先同意《肖像、声音、个人信息使用授权书》');
  if (!body.photo_base64 || !String(body.photo_base64).trim()) {
    errors.push('请上传个人照片');
  } else if (String(body.photo_base64).length > 4000000) {
    errors.push('照片过大，请换一张较小的图片');
  }
  if (body.photo_thumb_base64 && String(body.photo_thumb_base64).length > 400000) {
    errors.push('照片缩略图过大');
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
      attend_ceremony: String(body.attend_ceremony || '').trim(),
      accept_interview: String(body.accept_interview || '').trim(),
      interview_city: String(body.interview_city || '').trim(),
      accept_ceremony_interview: String(body.accept_ceremony_interview || '').trim(),
      auth_agreed: body.auth_agreed === true ? 1 : 0,
      photo_mime: String(body.photo_mime || '').trim(),
      photo_base64: String(body.photo_base64 || '').trim(),
      photo_thumb_base64: String(body.photo_thumb_base64 || '').trim(),
      client_ip: meta.clientIp,
      user_agent: meta.userAgent
    });
    return json(res, 200, { ok: true, id: id });
  } catch (err) {
    console.error('[nominee] insert failed', err);
    return json(res, 500, { error: '提交失败，请稍后重试' });
  }
};
