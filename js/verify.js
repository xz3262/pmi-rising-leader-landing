/* =========================================================
   PMI Rising Leader 2026 — 验票页（微信扫一扫打开）
   ========================================================= */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var orderId = params.get('order') || params.get('o') || '';

  // 短链接 /v/订单号（rewrite 后地址栏仍是 /v/...）
  if (!orderId) {
    var pathMatch = window.location.pathname.match(/^\/v\/([^/?#]+)/);
    if (pathMatch) orderId = decodeURIComponent(pathMatch[1]);
  }
  var titleEl = document.getElementById('verifyTitle');
  var subEl = document.getElementById('verifySub');
  var cardEl = document.getElementById('verifyCard');
  var noteEl = document.getElementById('verifyNote');
  var badgeEl = document.getElementById('verifyBadge');
  var historyEl = document.getElementById('verifyHistory');
  var historyCountEl = document.getElementById('vVerifyCount');
  var historyListEl = document.getElementById('vVerifyList');

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function formatDateTime(value) {
    if (!value) return '——';
    return String(value).trim();
  }

  function renderVerificationHistory(count, times) {
    if (!historyEl || !historyCountEl || !historyListEl) return;

    var total = Number(count) || (times && times.length) || 0;
    historyCountEl.textContent = '累计验票 ' + total + ' 次';
    historyListEl.innerHTML = '';

    if (!times || !times.length) {
      historyEl.hidden = true;
      return;
    }

    times.forEach(function (at, index) {
      var li = document.createElement('li');
      li.textContent = '第 ' + (index + 1) + ' 次 · ' + formatDateTime(at);
      historyListEl.appendChild(li);
    });
    historyEl.hidden = false;
  }

  function showInvalid(title, sub) {
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    if (cardEl) cardEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (historyEl) historyEl.hidden = true;
  }

  function showValid(order) {
    if (titleEl) titleEl.textContent = '验票通过';
    if (subEl) subEl.textContent = '以下为门票信息，请核对后放行';
    if (cardEl) cardEl.hidden = false;
    if (noteEl) noteEl.hidden = false;
    if (badgeEl) {
      badgeEl.textContent = '门票有效';
      badgeEl.className = 'verify__badge verify__badge--ok';
    }

    setText('vName', order.name || '——');
    setText('vCompany', order.company || '——');
    setText('vTitle', order.title || '——');
    setText('vIndustry', order.industry || '——');
    setText('vTicket', order.ticketName || '——');
    setText('vOrderedAt', formatDateTime(order.orderedAt));
    renderVerificationHistory(order.verifyCount, order.verifications);
  }

  function showUnpaid() {
    if (titleEl) titleEl.textContent = '门票未生效';
    if (subEl) subEl.textContent = '该订单尚未完成支付，无法验票';
    if (cardEl) cardEl.hidden = true;
    if (noteEl) noteEl.hidden = true;
    if (historyEl) historyEl.hidden = true;
    if (badgeEl) {
      badgeEl.textContent = '未支付';
      badgeEl.className = 'verify__badge verify__badge--bad';
    }
  }

  if (params.get('preview') === '1') {
    showValid({
      name: '张三（预览）',
      company: '示例科技有限公司',
      title: '项目总监',
      industry: '科技 / 互联网',
      ticketName: 'Invitation Ticket',
      orderedAt: '2026年6月2日 10:15:00',
      verifyCount: 2,
      verifications: ['2026年6月2日 10:20:00', '2026年6月2日 11:34:32']
    });
    return;
  }

  if (!orderId) {
    showInvalid('无法验票', '二维码无效，缺少订单信息');
    return;
  }

  fetch('/api/verify?order=' + encodeURIComponent(orderId))
    .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
    .then(function (res) {
      if (!res.ok) {
        showInvalid('门票无效', (res.body && res.body.error) || '未找到对应订单');
        return;
      }
      if (res.body.status !== 'paid') {
        showUnpaid();
        return;
      }
      showValid(res.body);
    })
    .catch(function () {
      showInvalid('查询失败', '网络异常，请稍后重试');
    });
})();
