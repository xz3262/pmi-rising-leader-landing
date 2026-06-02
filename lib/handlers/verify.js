'use strict';

const { getOrder, recordTicketVerification, listTicketVerifications } = require('../db');
const { json, requestMeta } = require('../http');
const { formatStoredChina } = require('../time');
const { syncPaidStatus } = require('../order-sync');

module.exports = async function handleVerify(req, res) {
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
      orderedAt: formatStoredChina(order.created_at),
      verifyCount: verifications.length,
      verifications: verifications.map(formatStoredChina)
    });
  } catch (err) {
    console.error('[verify] error', err);
    return json(res, 500, { error: '验票失败，请稍后重试' });
  }
};
