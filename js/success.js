/* =========================================================
   PMI Rising Leader 2026 — 成功页脚本
   读取报名信息 + 生成占位验票二维码
   ========================================================= */
(function () {
  'use strict';

  // 读取报名信息（占位：真实场景应由后端按订单号返回）
  var data = {};
  try { data = JSON.parse(sessionStorage.getItem('pmi_registration') || '{}'); } catch (e) {}

  var orderId = data.orderId || ('RL2026-' + String(Date.now()).slice(-10));

  // 填充票券信息
  setText('etType', data.ticketName || 'Standard Ticket');
  setText('etName', data.name || '——');
  setText('etCompany', data.company || '——');
  setText('etPay', data.payMethodLabel || '——');
  setText('qrOrder', '订单号 ' + orderId);

  // 生成占位二维码（确定性图案，含三个定位角，外观接近真实二维码）
  drawPlaceholderQR('qrCanvas', orderId);

  function setText(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

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

    // 基于订单号的伪随机序列（确定性）
    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

    // 数据点
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (isFinderZone(x, y, N)) continue;
        if (rnd() > 0.5) ctx.fillRect(x, y, 1, 1);
      }
    }
    // 三个定位角
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
