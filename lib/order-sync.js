'use strict';

const { getOrder, markOrderPaid } = require('./db');
const { queryZpayOrder } = require('./zpay');

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

module.exports = { syncPaidStatus };
