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
    setText('qrOrder', '订单号 ' + (order.orderId || orderId));
    drawPlaceholderQR('qrCanvas', order.orderId || orderId);
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

  /* 32x32 网格占位二维码 —— 仅作视觉占位，非真实可解码内容 */
  function drawPlaceholderQR(canvasId, seedStr) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !canvas.getContext) return;
    var N = 33;
    canvas.width = N; canvas.height = N;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = '#1a1033';

    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (isFinderZone(x, y, N)) continue;
        if (rnd() > 0.5) ctx.fillRect(x, y, 1, 1);
      }
    }
    drawFinder(ctx, 0, 0);
    drawFinder(ctx, N - 7, 0);
    drawFinder(ctx, 0, N - 7);
  }

  function isFinderZone(x, y, N) {
    return (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  }

  function drawFinder(ctx, ox, oy) {
    ctx.fillStyle = '#1a1033';
    ctx.fillRect(ox, oy, 7, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 1, oy + 1, 5, 5);
    ctx.fillStyle = '#1a1033';
    ctx.fillRect(ox + 2, oy + 2, 3, 3);
  }
})();
