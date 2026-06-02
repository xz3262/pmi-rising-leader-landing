const { listOrdersForAdmin } = require('./lib/db');
const { json } = require('./lib/http');
const { formatStoredChina } = require('./lib/time');
const { adminKeyOk, adminSecretConfigured } = require('./lib/admin');

var TICKET_TYPE_LABELS = {
  standard: '标准票',
  vip: 'VIP 票',
  test: '测试票',
  free: '邀请票'
};

var STATUS_LABELS = {
  paid: '已支付',
  pending: '待支付'
};

function formatMoney(amount) {
  var n = Number(amount);
  if (!isFinite(n)) return '——';
  if (n === 0) return '¥0';
  if (Math.abs(n - Math.round(n)) < 0.001) return '¥' + Math.round(n);
  return '¥' + n.toFixed(2);
}

function rowToOrder(row) {
  var status = String(row.status || 'pending');
  var ticket = String(row.ticket || '');
  var amount = status === 'paid' && row.paid_money != null && row.paid_money !== ''
    ? Number(row.paid_money)
    : Number(row.price);
  var purchasedRaw = status === 'paid' && row.paid_at ? row.paid_at : row.created_at;

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
    statusLabel: STATUS_LABELS[status] || status,
    purchasedAt: formatStoredChina(purchasedRaw)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

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
    console.error('[orders-admin] read failed', err);
    return json(res, 500, { error: '读取失败，请稍后重试' });
  }
};
