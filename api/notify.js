const { verifySign, env, queryZpayOrder } = require('./lib/zpay');
const { getOrder, markOrderPaid } = require('./lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).end('fail');
    return;
  }

  var key = env('ZPAY_KEY');
  if (!key) {
    res.status(500).end('fail');
    return;
  }

  var params = req.method === 'GET' ? req.query : req.body;
  if (!params || !params.out_trade_no) {
    res.status(400).end('fail');
    return;
  }

  if (!verifySign(params, key)) {
    console.error('[notify] invalid sign', params.out_trade_no);
    res.status(400).end('fail');
    return;
  }

  if (params.trade_status !== 'TRADE_SUCCESS') {
    res.status(200).end('success');
    return;
  }

  try {
    var order = await getOrder(String(params.out_trade_no));
    if (!order) {
      console.error('[notify] order not found', params.out_trade_no);
      res.status(404).end('fail');
      return;
    }

    var paidAmount = Number(params.money);
    if (Math.abs(paidAmount - Number(order.price)) > 0.001) {
      console.error('[notify] amount mismatch', params.out_trade_no, paidAmount, order.price);
      res.status(400).end('fail');
      return;
    }

    if (order.status !== 'paid') {
      var updated = await markOrderPaid(String(params.out_trade_no), {
        trade_no: String(params.trade_no || ''),
        zpay_type: String(params.type || ''),
        paid_money: paidAmount,
        buyer: String(params.buyer || '')
      });
      if (!updated) {
        var zpay = await queryZpayOrder(String(params.out_trade_no));
        if (zpay && Number(zpay.status) === 1) {
          await markOrderPaid(String(params.out_trade_no), {
            trade_no: String(zpay.trade_no || params.trade_no || ''),
            zpay_type: String(zpay.type || params.type || ''),
            paid_money: Number(zpay.money || paidAmount),
            buyer: String(zpay.buyer || params.buyer || '')
          });
        }
      }
    }

    res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('success');
  } catch (err) {
    console.error('[notify] error', err);
    res.status(500).end('fail');
  }
};
