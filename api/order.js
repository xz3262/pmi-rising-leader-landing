const {
  signParams,
  buildSubmitUrl,
  env
} = require('./lib/zpay');
const { insertOrder, markOrderPaid } = require('./lib/db');
const { parseBody, json, requestMeta } = require('./lib/http');

var TICKETS = {
  standard: { price: 399, name: 'Standard Ticket' },
  vip: { price: 699, name: 'VIP Ticket' },
  test: { price: 1, name: 'Test Ticket（支付测试）' },
  free: { price: 0, name: 'Invitation Ticket' }
};
var PAY_LABELS = { wxpay: '微信支付', alipay: '支付宝', free: '邀请码免费票' };

// 邀请码免费票：填入下列邀请码即可免支付直接出票（大小写不敏感）
var FREE_INVITE_CODES = ['PMI100'];
function isFreeInvite(code) {
  return FREE_INVITE_CODES.indexOf(String(code || '').trim().toUpperCase()) !== -1;
}

// 测试票：仅邀请码 TEST 可购买（大小写不敏感）
var TEST_INVITE_CODE = 'TEST';
function isTestInvite(code) {
  return String(code || '').trim().toUpperCase() === TEST_INVITE_CODE;
}

function generateOrderId() {
  var suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return ('RL2026' + Date.now() + suffix).slice(0, 32);
}

function validateBody(body) {
  var errors = [];
  if (!body.name || !String(body.name).trim()) errors.push('请填写姓名');
  if (!body.company || !String(body.company).trim()) errors.push('请填写公司');
  if (!body.title || !String(body.title).trim()) errors.push('请填写职位');
  if (!/^1\d{10}$/.test(String(body.phone || '').trim())) errors.push('请填写正确手机号');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email || '').trim())) errors.push('请填写正确邮箱');
  if (!body.industry || !String(body.industry).trim()) errors.push('请选择行业');
  if (!TICKETS[body.ticket]) errors.push('请选择票种');
  if (body.ticket === 'free') {
    if (!isFreeInvite(body.invite)) errors.push('邀请码无效');
  } else if (body.ticket === 'test') {
    if (!isTestInvite(body.invite)) errors.push('测试票需使用邀请码 TEST');
  } else if (body.payMethod !== 'wxpay' && body.payMethod !== 'alipay') {
    errors.push('请选择支付方式');
  }
  return errors;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var body = parseBody(req);
  if (!body) {
    return json(res, 400, { error: '请求格式错误' });
  }

  var errors = validateBody(body);
  if (errors.length) return json(res, 400, { error: errors[0] });

  var ticket = body.ticket;
  var ticketInfo = TICKETS[ticket];
  var price = ticketInfo.price;
  var ticketName = ticketInfo.name;
  var isFree = ticket === 'free';
  var payMethod = isFree ? 'free' : body.payMethod;
  var outTradeNo = generateOrderId();
  var productName = 'PMI Rising Leader 2026 ' + ticketName;
  var meta = requestMeta(req);

  // 付费票才需要 Z-Pay 配置；免费票走直接出票
  var pid = env('ZPAY_PID');
  var key = env('ZPAY_KEY');
  var cid = env('ZPAY_CID');
  var siteUrl = (env('SITE_URL') || 'https://www.hazelabs.app').replace(/\/$/, '');

  if (!isFree && (!pid || !key)) {
    return json(res, 500, { error: '支付未配置，请联系管理员' });
  }

  try {
    await insertOrder({
      merchant_order_no: outTradeNo,
      name: String(body.name).trim(),
      nickname: String(body.nickname || '').trim(),
      company: String(body.company).trim(),
      title: String(body.title).trim(),
      phone: String(body.phone).trim(),
      email: String(body.email).trim(),
      wechat: String(body.wechat || '').trim(),
      industry: String(body.industry).trim(),
      invite: String(body.invite || '').trim(),
      ticket: ticket,
      ticket_name: ticketName,
      product_name: productName,
      price: price,
      pay_method: payMethod,
      client_ip: meta.clientIp,
      user_agent: meta.userAgent
    });
  } catch (err) {
    console.error('[order] db insert failed', err);
    return json(res, 500, { error: '订单创建失败，请稍后重试' });
  }

  // 邀请码免费票：直接标记为已支付（来源 free），无需跳转收银台
  if (isFree) {
    try {
      await markOrderPaid(outTradeNo, {
        transaction_no: 'FREE-' + outTradeNo,
        zpay_type: 'free',
        paid_money: 0,
        buyer: String(body.invite || '').trim().toUpperCase()
      }, 'free');
    } catch (err) {
      console.error('[order] free ticket issue failed', err);
      return json(res, 500, { error: '出票失败，请稍后重试' });
    }
    return json(res, 200, {
      free: true,
      orderId: outTradeNo,
      payMethod: 'free',
      payMethodLabel: PAY_LABELS.free,
      ticketName: ticketName,
      price: price,
      returnUrl: '/success?out_trade_no=' + encodeURIComponent(outTradeNo)
    });
  }

  var notifyUrl = siteUrl + '/api/notify';
  var returnUrl = siteUrl + '/success';

  var submitParams = {
    pid: pid,
    type: payMethod,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: productName,
    money: price.toFixed(2),
    param: outTradeNo
  };
  if (cid) submitParams.cid = cid;
  submitParams.sign = signParams(submitParams, key);
  submitParams.sign_type = 'MD5';

  return json(res, 200, {
    orderId: outTradeNo,
    payUrl: buildSubmitUrl(submitParams),
    payMethod: payMethod,
    payMethodLabel: PAY_LABELS[payMethod],
    ticketName: ticketName,
    price: price
  });
};
