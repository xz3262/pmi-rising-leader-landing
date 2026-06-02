/* =========================================================
   PMI Rising Leader 2026 — 交互脚本
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 配色（用于占位渐变） ---------- */
  var GRADIENTS = [
    'linear-gradient(150deg,#ff6b3d,#e0359a)',
    'linear-gradient(150deg,#e0359a,#7c4dbb)',
    'linear-gradient(150deg,#7c4dbb,#4d6ef5)',
    'linear-gradient(150deg,#4d6ef5,#b3a0d9)',
    'linear-gradient(150deg,#ff4d8d,#7c4dbb)',
    'linear-gradient(150deg,#ff7a45,#ff4d8d)',
    'linear-gradient(150deg,#5a7cf0,#e0359a)'
  ];
  var SURNAMES = ['李','王','张','刘','陈','杨','赵','黄','周','吴','徐','孙','马','朱','胡','林','何','高','罗','郑','梁','谢','宋','唐','许','韩','冯','邓','曹','彭'];
  var ROLES = ['项目总监','研发负责人','产品总监','运营总监','技术VP','创新负责人','交付总监','战略总监'];

  function pick(arr, i) { return arr[i % arr.length]; }

  /* =========================================================
     1. Hero 海报墙（100 位 Rising Leader 占位）
     ========================================================= */
  function buildPosterWall() {
    var wall = document.getElementById('posterWall');
    if (!wall) return;

    var COLS = 6;
    var PER_COL = 9;            // 每列 9 张，6 列 ≈ 54 张可见，循环铺满
    var variants = ['up', 'down', 'up', 'down', 'up', 'down'];
    var speeds = ['', 'slow', 'fast', '', 'slow', 'fast'];
    var counter = 0;

    for (var c = 0; c < COLS; c++) {
      var col = document.createElement('div');
      col.className = 'poster-col poster-col--' + variants[c] + (speeds[c] ? ' poster-col--' + speeds[c] : '');

      // 生成一组，再复制一份以实现无缝循环
      var group = document.createDocumentFragment();
      for (var p = 0; p < PER_COL; p++) {
        counter++;
        group.appendChild(makePoster(counter));
      }
      col.appendChild(group.cloneNode(true));
      col.appendChild(group.cloneNode(true));
      wall.appendChild(col);
    }
  }

  function makePoster(n) {
    var idx = (n * 7) % GRADIENTS.length;
    var el = document.createElement('div');
    el.className = 'poster';
    el.style.background = pick(GRADIENTS, idx);

    var num = ('0' + (((n - 1) % 100) + 1)).slice(-2);
    var surname = pick(SURNAMES, n * 3);

    el.innerHTML =
      '<span class="poster__id">NO.' + num + '</span>' +
      '<span class="poster__avatar">' + surname + '</span>' +
      '<span class="poster__name">新锐管理者 ' + surname + '××</span>' +
      '<span class="poster__role">' + pick(ROLES, n) + '</span>';
    return el;
  }

  /* =========================================================
     2. 参会企业 logo 墙（占位）
     ========================================================= */
  var COMPANIES = [
    '华为','字节跳动','阿里云','京东','比亚迪','宁德时代',
    '药明康德','中国商飞','中国移动','联想','德勤','安永',
    '毕马威','埃森哲','美团','网易','小米','徐工集团'
  ];

  function buildLogoWall() {
    var wall = document.getElementById('logoWall');
    if (!wall) return;
    COMPANIES.forEach(function (name, i) {
      var item = document.createElement('div');
      item.className = 'logo-item';
      item.innerHTML =
        '<span class="logo-item__mark" style="background:' + pick(GRADIENTS, i * 3) + '">' +
          name.slice(0, 1) +
        '</span>' +
        '<span class="logo-item__name">' + name + '</span>';
      wall.appendChild(item);
    });
  }

  /* =========================================================
     3. 议程时间线
     ========================================================= */
  var AGENDA = [
    { t: '13:00', title: 'Rising Leader 红毯互动体验', desc: '签到 · 合影 · 暖场' },
    { t: '14:00', title: '开幕仪式' },
    { t: '14:15', title: 'PMI 中国区总裁主题演讲' },
    { t: '14:35', title: 'PMBOK® Guide 第八版发布仪式', hot: true },
    { t: '14:55', title: '主题演讲' },
    { t: '15:25', title: '2026 PMI 中国新锐项目管理精英奖颁奖典礼', hot: true, desc: '100 位全国百强新锐管理者加冕' },
    { t: '16:35', title: 'Fireside Chat 炉边对话' },
    { t: '18:00', title: 'Rising Leader Night 晚宴', desc: 'VIP 专享 · 交流晚宴' }
  ];

  function buildAgenda() {
    var list = document.getElementById('timeline');
    if (!list) return;
    AGENDA.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'tl';
      li.innerHTML =
        '<div class="tl__time">' + item.t + '</div>' +
        '<span class="tl__dot"></span>' +
        '<div class="tl__card">' +
          '<div class="tl__title' + (item.hot ? ' is-highlight' : '') + '">' + item.title + '</div>' +
          (item.desc ? '<div class="tl__desc">' + item.desc + '</div>' : '') +
        '</div>';
      list.appendChild(li);
    });
  }

  /* =========================================================
     4. 导航：滚动态 + 移动端菜单
     ========================================================= */
  function initNav() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var links = document.querySelector('.nav__links');

    var onScroll = function () {
      if (window.scrollY > 20) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          links.classList.remove('is-open');
          toggle.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* =========================================================
     5. 票种选择 + 价格联动
     ========================================================= */
  var PRICES = { standard: 399, vip: 699 };

  function initTickets() {
    var form = document.getElementById('regForm');
    if (!form) return;
    var totalEl = document.getElementById('totalPrice');
    var radios = form.querySelectorAll('input[name="ticket"]');

    function update() {
      var val = form.querySelector('input[name="ticket"]:checked');
      var price = val ? PRICES[val.value] : 0;
      if (totalEl) totalEl.textContent = '¥' + price;
    }
    radios.forEach(function (r) { r.addEventListener('change', update); });
    update();
  }

  /* =========================================================
     6. 表单校验 + 支付占位跳转
     ========================================================= */
  function initForm() {
    var form = document.getElementById('regForm');
    if (!form) return;
    var overlay = document.getElementById('payOverlay');
    var overlayDetail = document.getElementById('payOverlayDetail');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate(form)) {
        var firstErr = form.querySelector('.is-invalid');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var data = collect(form);

      // 写入 sessionStorage，供成功页读取（占位：真实场景应由后端返回订单号）
      try { sessionStorage.setItem('pmi_registration', JSON.stringify(data)); } catch (err) {}

      // === 支付占位 ===
      // TODO: 真实接入时，此处应 POST 报名信息到后端，换取微信/支付宝支付链接后跳转。
      //   fetch('/api/order', { method:'POST', body: JSON.stringify(data) })
      //     .then(r => r.json()).then(o => location.href = o.payUrl)
      if (overlay) {
        overlay.hidden = false;
        if (overlayDetail) overlayDetail.textContent = data.ticketName + ' · ¥' + data.price;
      }

      // 模拟支付完成后回跳成功页
      window.setTimeout(function () {
        // 占位短信：报名 + 支付成功确认（详见 sendSms 注释）
        sendSms(data, 'confirm');
        window.location.href = 'success.html';
      }, 1800);
    });

    // 实时清除错误态
    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
    });
  }

  function validate(form) {
    var ok = true;
    var required = form.querySelectorAll('[required]');
    required.forEach(function (el) {
      var v = (el.value || '').trim();
      var invalid = !v;
      if (!invalid && el.id === 'f-phone') invalid = !/^1\d{10}$/.test(v);
      if (!invalid && el.id === 'f-email') invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      el.classList.toggle('is-invalid', invalid);
      if (invalid) ok = false;
    });
    return ok;
  }

  function collect(form) {
    var t = form.querySelector('input[name="ticket"]:checked');
    var ticket = t ? t.value : 'standard';
    return {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      title: form.title.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      wechat: form.wechat.value.trim(),
      industry: form.industry.value,
      invite: form.invite.value.trim(),
      ticket: ticket,
      ticketName: ticket === 'vip' ? 'VIP Ticket' : 'Standard Ticket',
      price: PRICES[ticket],
      // 占位订单号（真实场景由后端生成）
      orderId: 'RL2026-' + String(((form.phone.value || '00000000000').slice(-6)) + Math.floor(Date.now() % 10000)).padStart(10, '0')
    };
  }

  /* =========================================================
     7. 短信占位（报名/支付确认 + 行前提醒）
     —— 真实场景由后端触发（阿里云短信 / 腾讯云短信等）
     —— 视觉确认（活动信息图 + 二维码）见 success.html
     ========================================================= */
  function sendSms(data, type) {
    var templates = {
      // 报名 + 支付成功后立即发送
      confirm: '【PMI Rising Leader】' + data.name + '，您已成功报名 2026 中国新锐项目管理精英大会（' + data.ticketName + '）。订单号 ' + data.orderId + '。6月27日苏州园区香格里拉大酒店见，凭成功页二维码现场验票。',
      // 活动前 3 天发送
      remindD3: '【PMI Rising Leader】' + data.name + '，大会将于 3 天后（6月27日）在苏州园区香格里拉大酒店举行。请提前规划行程，详见行前须知。',
      // 活动前 1 天发送
      remindD1: '【PMI Rising Leader】' + data.name + '，大会明日开启（6月27日 13:00 起）。请携带本人二维码准时签到，期待与您在苏州相见。'
    };
    // 占位：仅打印，真实场景改为后端定时任务 + 短信网关
    console.log('[SMS 占位] ' + (templates[type] || templates.confirm));
    return templates[type] || templates.confirm;
  }
  // 暴露给成功页/调试使用
  window.PMI = window.PMI || {};
  window.PMI.sendSms = sendSms;

  /* =========================================================
     8. 滚动入场动画
     ========================================================= */
  function initReveal() {
    var targets = document.querySelectorAll('.section__head, .vcard, .logo-item, .tl, .value__lead, .reg__info, .reg__tickets, .companies__footer');
    targets.forEach(function (el) { el.classList.add('reveal'); });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(el); });
  }

  /* =========================================================
     启动
     ========================================================= */
  function init() {
    buildPosterWall();
    buildLogoWall();
    buildAgenda();
    initNav();
    initTickets();
    initForm();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
