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
  var isFreeTicket = sessionData.payMethod === 'free';

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function showPending() {
    if (titleEl) {
      titleEl.textContent = isFreeTicket ? '正在为您准备门票…' : '支付确认中…';
    }
    if (subEl) {
      subEl.textContent = isFreeTicket ? '请稍候，即将完成出票' : '正在确认您的付款，请稍候';
    }
    if (eticketEl) eticketEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (smsEl) smsEl.hidden = true;
    if (actionsEl) actionsEl.hidden = true;
    if (outroEl) outroEl.hidden = true;
  }

  function showError(msg) {
    if (titleEl) titleEl.textContent = isFreeTicket ? '暂未完成出票' : '暂未确认支付';
    if (subEl) {
      subEl.textContent = msg || (isFreeTicket
        ? '请稍后再试或联系客服'
        : '如已完成付款，请稍后再试或联系客服');
    }
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

    setText('etType', order.ticketName || '——');
    setText('etName', order.name || '——');
    setText('etCompany', order.company || '——');
    setText('etPay', order.payMethodLabel || '——');
    var ticketOrderId = order.merchantOrderNo || order.orderId || orderId;
    showVerifyQR(ticketOrderId);
  }

  function showVerifyQR(ticketOrderId) {
    var canvas = document.getElementById('qrCanvas');
    if (!canvas || !ticketOrderId) return;

    // 短链接 /v/订单号：二维码更简单，微信更容易识别
    var verifyUrl = window.location.origin + '/v/' + encodeURIComponent(ticketOrderId);
    var displayPx = 200;
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
      showError(isFreeTicket
        ? '未找到订单号，请从报名页重新领取免费票'
        : '未找到订单号，请从报名页重新发起支付');
      return;
    }

    fetch('/api/order-status?out_trade_no=' + encodeURIComponent(orderId))
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.body && res.body.error) || '查询失败');
        if (res.body.payMethod === 'free') isFreeTicket = true;
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
        showError(isFreeTicket
          ? '出票结果尚未同步，请刷新页面'
          : '支付结果尚未同步，如已付款请刷新页面');
      })
      .catch(function (err) {
        showError(err.message || '查询失败，请稍后刷新');
      });
  }

  showPending();
  fetchOrder();
})();
