/* =========================================================
   PMI Rising Leader 2026 — 成功页脚本
   支付完成后展示活动信息票券 + 验票二维码
   ========================================================= */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var sessionData = {};
  try { sessionData = JSON.parse(sessionStorage.getItem('pmi_registration') || '{}'); } catch (e) {}

  var orderId = params.get('out_trade_no') || params.get('param') || sessionData.orderId || '';
  var titleEl = document.querySelector('.success__title');
  var subEl = document.querySelector('.success__sub');
  var noteEl = document.querySelector('.success__note');
  var smsEl = document.querySelector('.success__sms');
  var actionsEl = document.querySelector('.success__actions');
  var outroEl = document.querySelector('.success__outro');
  var eticketEl = document.querySelector('.eticket');
  var pollCount = 0;
  var pollMax = 20;

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function showPending() {
    if (titleEl) titleEl.textContent = '支付确认中…';
    if (subEl) subEl.textContent = '正在确认您的付款，请稍候';
    if (eticketEl) eticketEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (smsEl) smsEl.hidden = true;
    if (actionsEl) actionsEl.hidden = true;
    if (outroEl) outroEl.hidden = true;
  }

  function showError(msg) {
    if (titleEl) titleEl.textContent = '暂未确认支付';
    if (subEl) subEl.textContent = msg || '如已完成付款，请稍后再试或联系客服';
    if (eticketEl) eticketEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (smsEl) smsEl.hidden = true;
    if (actionsEl) actionsEl.hidden = false;
    if (outroEl) outroEl.hidden = false;
  }

  function showTicket(order) {
    if (titleEl) titleEl.textContent = '报名成功';
    if (subEl) subEl.innerHTML = '感谢报名 <b>PMI Rising Leader 2026</b>';
    if (eticketEl) eticketEl.hidden = false;
    if (noteEl) noteEl.hidden = false;
    if (smsEl) smsEl.hidden = false;
    if (actionsEl) actionsEl.hidden = false;
    if (outroEl) outroEl.hidden = false;

    setText('etType', order.ticketName || 'Standard Ticket');
    setText('etName', order.name || '——');
    setText('etCompany', order.company || '——');
    setText('etPay', order.payMethodLabel || '——');
    var ticketOrderId = order.merchantOrderNo || order.orderId || orderId;
    setText('qrOrder', '商户单号 ' + ticketOrderId);
    showVerifyQR(ticketOrderId);
  }

  function showVerifyQR(ticketOrderId) {
    var canvas = document.getElementById('qrCanvas');
    if (!canvas || !ticketOrderId) return;

    var verifyUrl = window.location.origin + '/verify.html?order=' + encodeURIComponent(ticketOrderId);
    var displayPx = 168;
    var dpr = Math.min(window.devicePixelRatio || 2, 3);
    var renderPx = Math.round(displayPx * dpr);

    var img = document.createElement('img');
    img.className = 'qr__code';
    img.alt = '验票二维码';
    img.decoding = 'sync';
    img.src = '/api/qr?w=' + renderPx + '&data=' + encodeURIComponent(verifyUrl);
    canvas.replaceWith(img);
  }

  function fetchOrder() {
    if (!orderId) {
      showError('未找到订单号，请从报名页重新发起支付');
      return;
    }

    fetch('/api/order-status?out_trade_no=' + encodeURIComponent(orderId))
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.body && res.body.error) || '查询失败');
        if (res.body.status === 'paid') {
          showTicket(res.body);
          return;
        }
        if (pollCount < pollMax) {
          pollCount += 1;
          showPending();
          window.setTimeout(fetchOrder, 2000);
          return;
        }
        showError('支付结果尚未同步，如已付款请刷新页面');
      })
      .catch(function (err) {
        showError(err.message || '查询失败，请稍后刷新');
      });
  }

  showPending();
  fetchOrder();
})();
