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
  // Hero 海报墙：PMI logo 与 Rising 100 海报，交替铺在品牌渐变卡片上
  var HERO_WALL_MARKS = [
    { img: 'assets/logo-pmi.png',             kind: 'logo',   label: 'PMI' },
    { img: 'assets/hero-wall-rising-100.png', kind: 'rising', label: 'Rising 100' }
  ];

  function pick(arr, i) { return arr[i % arr.length]; }
  function assetUrl(path) { return encodeURI(path).replace(/'/g, '%27'); }

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
    var mark = pick(HERO_WALL_MARKS, n);          // 按序号交替 logo / Rising 100
    var el = document.createElement('div');
    el.className = 'poster poster--brand';
    el.style.backgroundImage = pick(GRADIENTS, n); // 品牌渐变底，循环上色
    var face = document.createElement('span');
    face.className = 'poster__mark poster__mark--' + mark.kind;
    face.style.backgroundImage = "url('" + assetUrl(mark.img) + "')";
    el.appendChild(face);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', mark.label);
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
  var TICKETS = {
    standard: { price: 399, name: 'Standard Ticket' },
    vip: { price: 699, name: 'VIP Ticket' },
    test: { price: 1, name: 'Test Ticket（支付测试）' },
    free: { price: 0, name: 'Invitation Ticket' }
  };

  // 邀请码免费票：填入下列邀请码即可解锁免费票并直接出票（大小写不敏感）
  var FREE_INVITE_CODES = ['PMI100'];
  function isFreeInvite(code) {
    return FREE_INVITE_CODES.indexOf(String(code || '').trim().toUpperCase()) !== -1;
  }

  function initTickets() {
    var form = document.getElementById('regForm');
    if (!form) return;
    var totalEl = document.getElementById('totalPrice');
    var radios = form.querySelectorAll('input[name="ticket"]');
    var inviteEl = form.querySelector('#f-invite');
    var inviteBtn = document.getElementById('inviteBtn');
    var inviteMsg = document.getElementById('inviteMsg');
    var freeTicket = document.getElementById('ticketFree');
    var payWrap = document.getElementById('payWrap');
    var freeClaim = document.getElementById('freeClaim');
    var freeCodeLabel = document.getElementById('freeCodeLabel');
    var inviteOk = false;

    function selectedVal() {
      var v = form.querySelector('input[name="ticket"]:checked');
      return v ? v.value : 'standard';
    }
    function selectTicket(value) {
      var radio = form.querySelector('input[name="ticket"][value="' + value + '"]');
      if (radio) radio.checked = true;
    }
    function setInviteMsg(text, kind) {
      if (!inviteMsg) return;
      inviteMsg.textContent = text || '';
      inviteMsg.hidden = !text;
      inviteMsg.className = 'invite__msg' + (kind ? ' invite__msg--' + kind : '');
    }

    // 票种 → 合计金额 + 支付区 / 免费领取区切换
    function syncMode() {
      var val = selectedVal();
      var ticket = TICKETS[val] || TICKETS.standard;
      if (totalEl) totalEl.textContent = ticket.price > 0 ? ('¥' + ticket.price) : '免费';
      var isFree = (val === 'free');
      if (payWrap) payWrap.hidden = isFree;
      if (freeClaim) freeClaim.hidden = !isFree;
    }

    var freeRadio = freeTicket ? freeTicket.querySelector('input[name="ticket"]') : null;

    // 收起免费票（邀请码未确认 / 被改动时）
    function lockFree() {
      inviteOk = false;
      if (freeTicket) freeTicket.hidden = true;
      if (freeRadio) freeRadio.disabled = true;
      if (selectedVal() === 'free') selectTicket('standard');
      syncMode();
    }

    // 点击「确认」才校验邀请码并解锁免费票
    function confirmInvite() {
      var code = inviteEl ? inviteEl.value.trim() : '';
      if (!code) { lockFree(); setInviteMsg('请输入邀请码', 'err'); return; }
      if (isFreeInvite(code)) {
        inviteOk = true;
        if (freeCodeLabel) freeCodeLabel.textContent = code.toUpperCase();
        if (freeTicket) freeTicket.hidden = false;
        if (freeRadio) freeRadio.disabled = false;
        selectTicket('free');
        setInviteMsg('邀请码有效，已为你解锁免费票', 'ok');
        syncMode();
      } else {
        lockFree();
        setInviteMsg('邀请码无效，请确认后重试', 'err');
      }
    }

    radios.forEach(function (r) { r.addEventListener('change', syncMode); });
    if (inviteBtn) inviteBtn.addEventListener('click', confirmInvite);
    if (inviteEl) {
      // 确认后再修改邀请码，需重新确认
      inviteEl.addEventListener('input', function () {
        if (inviteOk) lockFree();
        setInviteMsg('', null);
      });
      inviteEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmInvite(); }
      });
    }
    lockFree();
    syncMode();
  }

  var PAY_LABELS = { wxpay: '微信支付', alipay: '支付宝', free: '邀请码免费票' };

  /* =========================================================
     6. 表单校验 + 支付占位跳转（微信 / 支付宝）
     ========================================================= */
  function initForm() {
    var form = document.getElementById('regForm');
    if (!form) return;
    var overlay = document.getElementById('payOverlay');
    var overlayDetail = document.getElementById('payOverlayDetail');
    var payBtns = form.querySelectorAll('[data-pay]');
    var claimFree = document.getElementById('claimFree');

    payBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        startPay(form, btn.getAttribute('data-pay'), overlay, overlayDetail);
      });
    });

    if (claimFree) {
      claimFree.addEventListener('click', function () {
        startFree(form, overlay, overlayDetail);
      });
    }

    // 阻止回车误提交（须点击支付方式按钮）
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    // 实时清除错误态
    form.addEventListener('input', function (e) {
      if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
    });
  }

  function startPay(form, payMethod, overlay, overlayDetail) {
    if (payMethod !== 'wxpay' && payMethod !== 'alipay') return;

    if (!validate(form)) {
      var firstErr = form.querySelector('.is-invalid');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var data = collect(form, payMethod);

    if (overlay) {
      overlay.hidden = false;
      setOverlayTitle('正在跳转至支付页面…');
      if (overlayDetail) {
        overlayDetail.textContent = data.payMethodLabel + ' · ' + data.ticketName + ' · ¥' + data.price;
      }
    }

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok || !res.body.payUrl) {
          throw new Error((res.body && res.body.error) || '创建支付失败');
        }
        var order = Object.assign({}, data, {
          orderId: res.body.orderId,
          payMethod: res.body.payMethod,
          payMethodLabel: res.body.payMethodLabel,
          ticketName: res.body.ticketName,
          price: res.body.price
        });
        try { sessionStorage.setItem('pmi_registration', JSON.stringify(order)); } catch (err) {}
        window.location.href = res.body.payUrl;
      })
      .catch(function (err) {
        if (overlay) overlay.hidden = true;
        window.alert(err.message || '网络错误，请稍后重试');
      });
  }

  // 邀请码免费票：免支付，提交后直接出票并跳转成功页
  function startFree(form, overlay, overlayDetail) {
    if (!validate(form)) {
      var firstErr = form.querySelector('.is-invalid');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!isFreeInvite(form.invite.value)) {
      window.alert('邀请码无效，请确认后重试');
      return;
    }

    var data = collect(form, 'free');

    if (overlay) {
      overlay.hidden = false;
      setOverlayTitle('正在为您出票…');
      if (overlayDetail) overlayDetail.textContent = data.ticketName + ' · 免费（邀请码）';
    }

    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok || !res.body.orderId) {
          throw new Error((res.body && res.body.error) || '出票失败');
        }
        var order = Object.assign({}, data, {
          orderId: res.body.orderId,
          merchantOrderNo: res.body.orderId,
          payMethod: 'free',
          payMethodLabel: res.body.payMethodLabel || PAY_LABELS.free,
          ticketName: res.body.ticketName,
          price: res.body.price
        });
        try { sessionStorage.setItem('pmi_registration', JSON.stringify(order)); } catch (err) {}
        window.location.href = res.body.returnUrl ||
          ('success.html?out_trade_no=' + encodeURIComponent(res.body.orderId));
      })
      .catch(function (err) {
        if (overlay) overlay.hidden = true;
        window.alert(err.message || '网络错误，请稍后重试');
      });
  }

  function setOverlayTitle(text) {
    var el = document.getElementById('payOverlayTitle');
    if (el) el.textContent = text;
  }

  function validate(form) {
    var ok = true;
    var required = form.querySelectorAll('[required]');
    required.forEach(function (el) {
      var v = (el.value || '').trim();
      var invalid = !v;
      if (!invalid && (el.type === 'tel' || el.name === 'phone')) invalid = !/^1\d{10}$/.test(v);
      if (!invalid && (el.type === 'email' || el.name === 'email')) invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      el.classList.toggle('is-invalid', invalid);
      if (invalid) ok = false;
    });
    return ok;
  }

  function collect(form, payMethod) {
    var t = form.querySelector('input[name="ticket"]:checked');
    var ticket = t && TICKETS[t.value] ? t.value : 'standard';
    var ticketInfo = TICKETS[ticket] || TICKETS.standard;
    var method = payMethod === 'free' ? 'free' : (payMethod === 'alipay' ? 'alipay' : 'wxpay');
    return {
      name: form.name.value.trim(),
      nickname: form.nickname ? form.nickname.value.trim() : '',
      company: form.company.value.trim(),
      title: form.title.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      wechat: form.wechat.value.trim(),
      industry: form.industry.value,
      invite: form.invite.value.trim(),
      ticket: ticket,
      ticketName: ticketInfo.name,
      price: ticketInfo.price,
      payMethod: method,
      payMethodLabel: PAY_LABELS[method],
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
      confirm: '【PMI Rising Leader】' + data.name + '，您已通过' + (data.payMethodLabel || '在线支付') + '成功报名 2026 中国新锐项目管理精英大会（' + data.ticketName + '）。订单号 ' + data.orderId + '。6月27日苏州园区香格里拉大酒店见，凭成功页二维码现场验票。',
      // 活动前 3 天发送
      remindD3: '【PMI Rising Leader】' + data.name + '，大会将于 3 天后（6月27日）在苏州园区香格里拉大酒店举行。请提前规划行程，详见行前须知。',
      // 活动前 1 天发送
      remindD1: '【PMI Rising Leader】' + data.name + '，大会明日开启（6月27日 13:00 起）。请携带本人二维码准时签到，期待与您在苏州相见。'
    };
    // 占位：仅打印，真实场景改为后端定时任务 + 短信网关
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[SMS] ' + (templates[type] || templates.confirm));
    }
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
     9. 弹窗基础（共用）
     ========================================================= */
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
  }
  function initModals() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var open = document.querySelector('.modal:not([hidden])');
        if (open) closeModal(open);
      }
    });
  }

  /* =========================================================
     10. 第六屏 弹幕墙（一段话，诠释项目管理人生）
     ========================================================= */
  var BARRAGE_SEED = [
    { txt: '项目管理，是把不确定一点点变成确定。', who: '十年 PM' },
    { txt: '计划赶不上变化，但计划让你在变化里不慌。', who: '交付总监' },
    { txt: '进度、成本、质量，我们一直在三角里找平衡。' },
    { txt: '真正的里程碑，是团队一起扛过来的那些夜晚。', who: '研发负责人' },
    { txt: '沟通解决八成的问题，剩下两成靠复盘。', who: '产品经理' },
    { txt: '风险不会消失，只会留给没准备的人。' },
    { txt: '把复杂的事拆简单，是项目经理的浪漫。', who: '战略总监' },
    { txt: '交付的不只是项目，更是彼此的信任。' },
    { txt: '管理项目，先管理好自己的预期。', who: '运营总监' },
    { txt: '让对的人，在对的时间，做对的事。' },
    { txt: '复盘不是追责，是让下一次做得更好。', who: '技术 VP' },
    { txt: '项目结束那天，最舍不得的是这群人。' }
  ];
  var ROW_COUNT = 3;
  var barrageRows = [];

  function bubbleHTML(item, idx) {
    var cls = 'bubble bubble--t' + (idx % 4) + (item.mine ? ' bubble--mine' : '');
    return '<span class="' + cls + '">' +
      '<span class="bubble__txt">' + escHtml(item.txt) + '</span>' +
      (item.who ? '<span class="bubble__who">' + escHtml(item.who) + '</span>' : '') +
      '</span>';
  }
  function renderRow(row, items) {
    var inner = items.map(bubbleHTML).join('');
    row.innerHTML =
      '<div class="barrage__group">' + inner + '</div>' +
      '<div class="barrage__group" aria-hidden="true">' + inner + '</div>';
  }
  function shortestRow() {
    var ri = 0, min = Infinity;
    for (var i = 0; i < barrageRows.length; i++) {
      if (barrageRows[i].length < min) { min = barrageRows[i].length; ri = i; }
    }
    return ri;
  }
  function updateBarrageCount() {
    var n = 0;
    barrageRows.forEach(function (r) { n += r.length; });
    var el = document.getElementById('barrageCount');
    if (el) el.textContent = n;
  }
  function loadMyBarrage() {
    try { return JSON.parse(localStorage.getItem('pmi_barrage') || '[]'); } catch (e) { return []; }
  }
  function persistMyBarrage() {
    try {
      var mine = [];
      barrageRows.forEach(function (items) {
        items.forEach(function (it) { if (it.mine) mine.push(it.txt); });
      });
      localStorage.setItem('pmi_barrage', JSON.stringify(mine.slice(0, 50)));
    } catch (e) {}
  }
  function addBarrage(txt) {
    var ri = shortestRow();
    barrageRows[ri].unshift({ txt: txt, who: '我', mine: true });
    var row = document.querySelector('.barrage__row[data-row="' + ri + '"]');
    if (row) renderRow(row, barrageRows[ri]);
    persistMyBarrage();
    updateBarrageCount();
  }
  function buildBarrage() {
    var stage = document.getElementById('barrageStage');
    if (!stage) return;
    var r;
    for (r = 0; r < ROW_COUNT; r++) barrageRows.push([]);
    BARRAGE_SEED.forEach(function (item, i) { barrageRows[i % ROW_COUNT].push(item); });
    // 回填本机已发送内容
    loadMyBarrage().forEach(function (txt) {
      barrageRows[shortestRow()].unshift({ txt: txt, who: '我', mine: true });
    });
    var mods = ['', 'barrage__row--rev barrage__row--slow', 'barrage__row--fast'];
    for (r = 0; r < ROW_COUNT; r++) {
      var row = document.createElement('div');
      row.className = 'barrage__row ' + mods[r];
      row.setAttribute('data-row', r);
      renderRow(row, barrageRows[r]);
      stage.appendChild(row);
    }
    updateBarrageCount();
  }
  function initBarrage() {
    buildBarrage();
    var form = document.getElementById('barrageForm');
    var input = document.getElementById('barrageInput');
    var modal = document.getElementById('sendModal');
    if (!form || !input || !modal) return;
    var preview = document.getElementById('sendPreview');
    var agree = document.getElementById('sendAgree');
    var confirmBtn = document.getElementById('sendConfirm');
    var pending = '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      if (!v) { input.focus(); return; }
      pending = v;
      if (preview) preview.textContent = '“' + v + '”';
      if (agree) agree.checked = false;
      if (confirmBtn) confirmBtn.disabled = true;
      openModal(modal);
    });
    if (agree && confirmBtn) {
      agree.addEventListener('change', function () { confirmBtn.disabled = !agree.checked; });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if ((agree && !agree.checked) || !pending) return;
        confirmBtn.disabled = true;
        fetch('/api/barrage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: pending, agreed_terms: true })
        })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
          .then(function (res) {
            if (!res.ok || !res.body.ok) throw new Error((res.body && res.body.error) || '发送失败');
            addBarrage(pending);
            pending = '';
            input.value = '';
            closeModal(modal);
          })
          .catch(function (err) {
            window.alert(err.message || '发送失败，请稍后重试');
          })
          .finally(function () {
            confirmBtn.disabled = !agree || !agree.checked;
          });
      });
    }
    modal.querySelectorAll('[data-send-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(modal); });
    });
  }

  /* =========================================================
     11. 第五屏 Nominee 获奖流程（多步弹窗）
     ========================================================= */
  function initNominee() {
    var modal = document.getElementById('nomineeModal');
    if (!modal) return;
    var steps = modal.querySelectorAll('.nstep');
    var dots = modal.querySelectorAll('.nominee__dots span');
    var panel = modal.querySelector('.modal__panel');
    var current = 1;

    function show(step) {
      current = step;
      steps.forEach(function (s) { s.classList.toggle('is-active', Number(s.getAttribute('data-step')) === step); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === step - 1); });
      if (panel) panel.scrollTop = 0;
    }

    document.querySelectorAll('[data-nominee-open]').forEach(function (b) {
      b.addEventListener('click', function () { show(1); openModal(modal); });
    });
    modal.querySelectorAll('[data-nominee-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(modal); });
    });
    modal.querySelectorAll('[data-nominee-next]').forEach(function (el) {
      el.addEventListener('click', function () { show(current + 1); });
    });

    // 个人照片预览
    var photo = document.getElementById('n-photo');
    var preview = document.getElementById('photoPreview');
    if (photo && preview) {
      photo.addEventListener('change', function () {
        var f = photo.files && photo.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          preview.innerHTML = '<img src="' + ev.target.result + '" alt="个人照片预览" />';
          var wrap = photo.closest('.photo-up');
          if (wrap) wrap.classList.add('has-photo');
        };
        reader.readAsDataURL(f);
      });
    }

    // 注册信息提交 → 入库 → 感谢页
    var nform = document.getElementById('nomineeForm');
    if (nform) {
      nform.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(nform)) {
          var firstErr = nform.querySelector('.is-invalid');
          if (firstErr) firstErr.focus();
          return;
        }
        var submitBtn = nform.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        readNomineePhoto(photo).then(function (photoData) {
          if (photoData.error) throw new Error(photoData.error);
          return fetch('/api/nominee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nform.name.value.trim(),
              nickname: nform.nickname ? nform.nickname.value.trim() : '',
              company: nform.company.value.trim(),
              title: nform.title.value.trim(),
              phone: nform.phone.value.trim(),
              email: nform.email.value.trim(),
              wechat: nform.wechat ? nform.wechat.value.trim() : '',
              address: nform.address.value.trim(),
              photo_mime: photoData.photo_mime,
              photo_base64: photoData.photo_base64
            })
          });
        })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
          .then(function (res) {
            if (!res.ok || !res.body.ok) throw new Error((res.body && res.body.error) || '提交失败');
            show(4);
          })
          .catch(function (err) {
            window.alert(err.message || '提交失败，请稍后重试');
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
      nform.addEventListener('input', function (e) {
        if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
      });
    }
  }

  function readNomineePhoto(input) {
    return new Promise(function (resolve) {
      var f = input && input.files && input.files[0];
      if (!f) return resolve({ photo_mime: '', photo_base64: '' });
      if (f.size > 800000) return resolve({ error: '照片请小于 800KB' });
      var reader = new FileReader();
      reader.onload = function (ev) {
        var dataUrl = String(ev.target.result || '');
        var parts = dataUrl.split(',');
        resolve({
          photo_mime: f.type || 'image/jpeg',
          photo_base64: parts[1] || ''
        });
      };
      reader.onerror = function () { resolve({ error: '照片读取失败' }); };
      reader.readAsDataURL(f);
    });
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
    initModals();
    initBarrage();
    initNominee();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
