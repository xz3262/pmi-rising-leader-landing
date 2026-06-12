'use strict';

const { listOrdersForAdmin, getOrderQrArchive, saveOrderTicketQr } = require('../db');
const { json } = require('../http');
const { formatStoredChina } = require('../time');
const { adminKeyOk, adminSecretConfigured } = require('../admin');
const { generateTicketQrBase64 } = require('../ticket-qr');
const { env } = require('../zpay');

var TICKET_TYPE_LABELS = {
  cert: '持证人',
  noncert: '非持证人',
  standard: '标准票',
  vip: 'VIP 票',
  test: '测试票',
  free: '邀请票',
  nominee: '提名嘉宾'
};

var PAY_METHOD_LABELS = {
  wxpay: '微信支付',
  alipay: '支付宝',
  free: '免费出票'
};

function formatMoney(amount) {
  var n = Number(amount);
  if (!isFinite(n)) return '——';
  if (n === 0) return '¥0';
  if (Math.abs(n - Math.round(n)) < 0.001) return '¥' + Math.round(n);
  return '¥' + n.toFixed(2);
}

function resolveStatusBadge(row) {
  var status = String(row.status || 'pending');
  var ticket = String(row.ticket || '');
  var price = Number(row.price);
  var isFreeTicket = ticket === 'free' || (!isNaN(price) && price === 0);

  if (status !== 'paid') {
    return { show: false, label: '', variant: '' };
  }
  if (isFreeTicket) {
    return { show: true, label: '邀请出票', variant: 'invite' };
  }
  return { show: true, label: '已支付', variant: 'paid' };
}

function rowToOrder(row) {
  var status = String(row.status || 'pending');
  var ticket = String(row.ticket || '');
  var amount = status === 'paid' && row.paid_money != null && row.paid_money !== ''
    ? Number(row.paid_money)
    : Number(row.price);
  var purchasedRaw = status === 'paid' && row.paid_at ? row.paid_at : row.created_at;
  var badge = resolveStatusBadge(row);

  var payMethod = String(row.pay_method || '');
  return {
    merchantOrderNo: String(row.merchant_order_no || ''),
    transactionNo: String(row.transaction_no || ''),
    name: String(row.name || ''),
    nickname: String(row.nickname || ''),
    company: String(row.company || ''),
    title: String(row.title || ''),
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    wechat: String(row.wechat || ''),
    industry: String(row.industry || ''),
    invite: String(row.invite || ''),
    ticketName: String(row.ticket_name || ''),
    ticketType: TICKET_TYPE_LABELS[ticket] || ticket,
    amount: amount,
    amountLabel: formatMoney(amount),
    payMethod: payMethod,
    payMethodLabel: PAY_METHOD_LABELS[payMethod] || payMethod,
    status: status,
    statusBadge: badge,
    verifyUrl: String(row.verify_url || ''),
    verifyCount: Number(row.verify_count || 0),
    createdAt: formatStoredChina(row.created_at),
    paidAt: row.paid_at ? formatStoredChina(row.paid_at) : '',
    purchasedAt: formatStoredChina(purchasedRaw)
  };
}

// 单笔订单的二维码存档：缺图时按存档链接补生成（部署窗口期漏写的订单自愈）
async function handleOrderQrDetail(res, orderNo) {
  var row = await getOrderQrArchive(orderNo);
  if (!row) return json(res, 404, { error: '订单不存在' });

  var qrB64 = String(row.qr_png_base64 || '').trim();
  var verifyUrl = String(row.verify_url || '').trim();
  if (!verifyUrl) {
    // 部署窗口期由旧实例创建的订单两列皆空：按与出票/回填一致的规则推导
    var base = String(env('SITE_URL') || 'https://www.rising2026.com').replace(/\/$/, '');
    verifyUrl = base + '/v/' + encodeURIComponent(orderNo);
  }
  if (!qrB64) {
    try {
      qrB64 = await generateTicketQrBase64(verifyUrl);
      await saveOrderTicketQr(orderNo, qrB64, verifyUrl);
    } catch (err) {
      console.error('[admin/orders] qr heal failed (non-fatal)', err);
      qrB64 = '';
    }
  }

  return json(res, 200, {
    ok: true,
    order: {
      merchantOrderNo: String(row.merchant_order_no || ''),
      verifyUrl: verifyUrl,
      qrDataUrl: qrB64 ? 'data:image/png;base64,' + qrB64 : ''
    }
  });
}

module.exports = async function handleAdminOrders(req, res) {
  if (!adminSecretConfigured()) {
    return json(res, 503, { error: '未配置访问密钥，请在环境变量设置 NOMINEE_ADMIN_SECRET' });
  }
  if (!adminKeyOk(req)) {
    return json(res, 401, { error: '密钥无效或未提供' });
  }

  try {
    var orderNo = String(req.query.order || '').trim();
    if (orderNo) {
      return await handleOrderQrDetail(res, orderNo);
    }

    var rows = await listOrdersForAdmin();
    return json(res, 200, {
      ok: true,
      orders: rows.map(rowToOrder)
    });
  } catch (err) {
    console.error('[admin/orders] read failed', err);
    return json(res, 500, { error: '读取失败，请稍后重试' });
  }
};
