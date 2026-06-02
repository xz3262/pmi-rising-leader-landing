'use strict';

const { getOrder } = require('../db');
const { json } = require('../http');
const { syncPaidStatus } = require('../order-sync');

var PAY_LABELS = { wxpay: '微信支付', alipay: '支付宝', free: '邀请码免费票' };

module.exports = async function handleOrderStatus(req, res) {
  var merchantOrderNo = String(
    req.query.merchant_order_no || req.query.out_trade_no || req.query.orderId || ''
  ).trim();
  if (!merchantOrderNo) {
    return json(res, 400, { error: '缺少商户单号' });
  }

  try {
    var order = await getOrder(merchantOrderNo);
    if (!order) {
      return json(res, 404, { error: '订单不存在' });
    }

    if (order.status !== 'paid') {
      order = await syncPaidStatus(order);
    }

    return json(res, 200, {
      merchantOrderNo: order.merchant_order_no,
      orderId: order.merchant_order_no,
      status: order.status,
      paidSource: order.paid_source || null,
      paidSourceLabel: order.paid_source === 'notify' ? '支付回调' : (order.paid_source === 'sync' ? '成功页回查' : (order.paid_source === 'free' ? '邀请码免费票' : null)),
      notifyAt: order.notify_at || null,
      notifyReceived: Boolean(order.notify_at),
      name: order.name,
      company: order.company,
      title: order.title,
      industry: order.industry,
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
