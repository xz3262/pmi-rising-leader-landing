'use strict';

const { listOrdersForAdmin } = require('../db');
const { json } = require('../http');
const { formatStoredChina } = require('../time');
const { adminKeyOk, adminSecretConfigured } = require('../admin');

var TICKET_TYPE_LABELS = {
  cert: '持证人',
  noncert: '非持证人',
  standard: '标准票',
  vip: 'VIP 票',
  test: '测试票',
  free: '邀请票'
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

  return {
    merchantOrderNo: String(row.merchant_order_no || ''),
    name: String(row.name || ''),
    company: String(row.company || ''),
    title: String(row.title || ''),
    ticketName: String(row.ticket_name || ''),
    ticketType: TICKET_TYPE_LABELS[ticket] || ticket,
    amount: amount,
    amountLabel: formatMoney(amount),
    status: status,
    statusBadge: badge,
    purchasedAt: formatStoredChina(purchasedRaw)
  };
}

module.exports = async function handleAdminOrders(req, res) {
  if (!adminSecretConfigured()) {
    return json(res, 503, { error: '未配置访问密钥，请在环境变量设置 NOMINEE_ADMIN_SECRET' });
  }
  if (!adminKeyOk(req)) {
    return json(res, 401, { error: '密钥无效或未提供' });
  }

  try {
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
