const { getOrder, markOrderPaid, recordTicketVerification, listTicketVerifications } = require('./lib/db');
const { queryZpayOrder } = require('./lib/zpay');
const { json, requestMeta } = require('./lib/http');

async function syncPaidStatus(order) {
  if (!order || order.status === 'paid') return order;
  var zpay = await queryZpayOrder(order.merchant_order_no);
  if (!zpay || Number(zpay.code) !== 1 || Number(zpay.status) !== 1) return order;

  var paidAmount = Number(zpay.money);
  if (Math.abs(paidAmount - Number(order.price)) > 0.001) return order;

  await markOrderPaid(String(order.merchant_order_no), {
    transaction_no: String(zpay.trade_no || ''),
    zpay_type: String(zpay.type || ''),
    paid_money: paidAmount,
    buyer: String(zpay.buyer || '')
  }, 'sync');
  return getOrder(order.merchant_order_no);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var merchantOrderNo = String(
    req.query.merchant_order_no || req.query.out_trade_no || req.query.order || req.query.orderId || ''
  ).trim();
  if (!merchantOrderNo) {
    return json(res, 400, { error: '缺少订单号' });
  }

  try {
    var order = await getOrder(merchantOrderNo);
    if (!order) {
      return json(res, 404, { error: '订单不存在' });
    }

    if (order.status !== 'paid') {
      order = await syncPaidStatus(order);
    }

    if (order.status !== 'paid') {
      return json(res, 200, { status: 'pending' });
    }

    var meta = requestMeta(req);
    await recordTicketVerification(merchantOrderNo, meta);
    var verifications = await listTicketVerifications(merchantOrderNo);

    return json(res, 200, {
      status: 'paid',
      name: order.name,
      company: order.company,
      title: order.title,
      industry: order.industry,
      ticketName: order.ticket_name,
      orderedAt: order.created_at || null,
      verifyCount: verifications.length,
      verifications: verifications
    });
  } catch (err) {
    console.error('[verify] error', err);
    return json(res, 500, { error: '验票失败，请稍后重试' });
  }
};
