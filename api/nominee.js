const { insertNominee, insertOrder, markOrderPaid } = require('../lib/db');
const { parseBody, json, requestMeta } = require('../lib/http');
const { env } = require('../lib/zpay');
const { generateTicketQrBase64 } = require('../lib/ticket-qr');
const { nomineePosterToken } = require('../lib/admin');

// 提名嘉宾免费入场票：与购票出票同一套订单/验票体系，票号可被检票系统扫验
var NOMINEE_TICKET_NAME = '百强新锐提名嘉宾票';

function generateNomineeOrderId() {
  var suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return ('RLN2026' + Date.now() + suffix).slice(0, 32);
}

// 出票失败不阻断信息提交：返回空票号，前端隐藏二维码区块
async function issueNomineeTicket(body, meta) {
  var orderNo = generateNomineeOrderId();
  var siteUrl = String(env('SITE_URL') || 'https://www.rising2026.com').replace(/\/$/, '');
  var verifyUrl = siteUrl + '/v/' + encodeURIComponent(orderNo);
  // 二维码图片同步存档；生成失败不阻断出票，后台查看时会自愈补档
  var qrPngBase64 = '';
  try {
    qrPngBase64 = await generateTicketQrBase64(verifyUrl);
  } catch (err) {
    console.error('[nominee] qr archive failed (non-fatal)', err);
  }
  await insertOrder({
    merchant_order_no: orderNo,
    name: String(body.name).trim(),
    nickname: String(body.nickname || '').trim(),
    company: String(body.company).trim(),
    title: String(body.title).trim(),
    phone: String(body.phone).trim(),
    email: String(body.email).trim(),
    wechat: String(body.wechat || '').trim(),
    industry: '',
    invite: 'NOMINEE',
    ticket: 'nominee',
    ticket_name: NOMINEE_TICKET_NAME,
    product_name: 'PMI Rising Leader 2026 ' + NOMINEE_TICKET_NAME,
    price: 0,
    pay_method: 'free',
    verify_url: verifyUrl,
    qr_png_base64: qrPngBase64,
    client_ip: meta.clientIp,
    user_agent: meta.userAgent
  });
  await markOrderPaid(orderNo, {
    transaction_no: 'NOMINEE-' + orderNo,
    zpay_type: 'nominee',
    paid_money: 0,
    buyer: 'NOMINEE'
  }, 'free');
  return { orderNo: orderNo, verifyUrl: verifyUrl };
}

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

var ABILITY_TAGS = [
  'Certified Strategic Thinker',
  'Certified Value Creator',
  'Certified Team Builder',
  'Certified Decision Maker'
];

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
  var proud = String(body.proud_decision || '').trim();
  if (!proud) errors.push('请填写「过去一年最自豪的一次管理决策」');
  else if (proud.length > 2000) errors.push('「最自豪的管理决策」请控制在 2000 字以内');
  var complexProblem = String(body.complex_problem || '').trim();
  if (!complexProblem) errors.push('请填写「你解决过最复杂的问题」');
  else if (complexProblem.length > 2000) errors.push('「解决过最复杂的问题」请控制在 2000 字以内');
  var oneLineIntro = String(body.one_line_intro || '').trim();
  if (!oneLineIntro) errors.push('请填写「一句话介绍自己」');
  else if (oneLineIntro.length > 200) errors.push('「一句话介绍自己」请控制在 200 字以内');
  if (ABILITY_TAGS.indexOf(String(body.ability_tag || '').trim()) === -1) {
    errors.push('请选择你最认同的能力标签');
  }
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

  // 先出入场票（免费票直接置为已支付），拿到票号后随提名信息一并入库
  var ticketOrderNo = '';
  var ticketVerifyUrl = '';
  try {
    var issued = await issueNomineeTicket(body, meta);
    ticketOrderNo = issued.orderNo;
    ticketVerifyUrl = issued.verifyUrl;
  } catch (err) {
    console.error('[nominee] ticket issue failed', err);
    ticketOrderNo = '';
    ticketVerifyUrl = '';
  }

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
      proud_decision: String(body.proud_decision || '').trim(),
      complex_problem: String(body.complex_problem || '').trim(),
      one_line_intro: String(body.one_line_intro || '').trim(),
      ability_tag: String(body.ability_tag || '').trim(),
      auth_agreed: body.auth_agreed === true ? 1 : 0,
      ticket_order_no: ticketOrderNo,
      photo_mime: String(body.photo_mime || '').trim(),
      photo_base64: String(body.photo_base64 || '').trim(),
      photo_thumb_base64: String(body.photo_thumb_base64 || '').trim(),
      client_ip: meta.clientIp,
      user_agent: meta.userAgent
    });
    return json(res, 200, {
      ok: true,
      id: id,
      posterToken: nomineePosterToken(id),
      ticketOrderNo: ticketOrderNo,
      ticketVerifyUrl: ticketVerifyUrl
    });
  } catch (err) {
    console.error('[nominee] insert failed', err);
    return json(res, 500, { error: '提交失败，请稍后重试' });
  }
};
