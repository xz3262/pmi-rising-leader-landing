const { getOrder, markOrderPaid } = require('./lib/db');
const { queryZpayOrder } = require('./lib/zpay');
const { json } = require('./lib/http');

var PAY_LABELS = { wxpay: '微信支付', alipay: '支付宝' };

async function syncPaidStatus(order) {
  if (!order || order.status === 'paid') return order;
  var zpay = await queryZpayOrder(order.out_trade_no);
  if (!zpay || Number(zpay.code) !== 1 || Number(zpay.status) !== 1) return order;

  var paidAmount = Number(zpay.money);
  if (Math.abs(paidAmount - Number(order.price)) > 0.001) return order;

  await markOrderPaid(String(order.out_trade_no), {
    trade_no: String(zpay.trade_no || ''),
    zpay_type: String(zpay.type || ''),
    paid_money: paidAmount,
    buyer: String(zpay.buyer || '')
  });
  return getOrder(order.out_trade_no);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var outTradeNo = String(req.query.out_trade_no || req.query.orderId || '').trim();
  if (!outTradeNo) {
    return json(res, 400, { error: '缺少订单号' });
  }

  try {
    var order = await getOrder(outTradeNo);
    if (!order) {
      return json(res, 404, { error: '订单不存在' });
    }

    if (order.status !== 'paid') {
      order = await syncPaidStatus(order);
    }

    return json(res, 200, {
      orderId: order.out_trade_no,
      status: order.status,
      name: order.name,
      company: order.company,
      ticketName: order.ticket_name,
      payMethod: order.pay_method,
      payMethodLabel: PAY_LABELS[order.pay_method] || order.pay_method,
      price: order.price
    });
  } catch (err) {
    console.error('[order-status] error', err);
    return json(res, 500, { error: '查询失败' });
  }
};
