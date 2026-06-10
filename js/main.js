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
  // Hero 海报墙：白色 PMI logo 与 Rising 100 logo 交替，无卡片直接滚动
  var HERO_WALL_MARKS = [
    { img: 'assets/hero-wall-blank.png',      kind: 'blank',  label: 'PMI' },
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

    var COLS = 9;
    var PER_COL = 13;           // 列更多、每列更密，铺满更紧凑的小 logo 阵列
    var variants = ['up', 'down', 'up', 'down', 'up', 'down'];
    var speeds = ['', 'slow', 'fast', '', 'slow', 'fast'];
    var counter = 0;

    for (var c = 0; c < COLS; c++) {
      var col = document.createElement('div');
      col.className = 'poster-col poster-col--' + pick(variants, c) + (pick(speeds, c) ? ' poster-col--' + pick(speeds, c) : '');

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
    var mark = pick(HERO_WALL_MARKS, n);          // 按序号交替留白 / Rising 100
    var el = document.createElement('div');
    el.className = 'poster';
    var face = document.createElement('span');
    face.className = 'poster__mark poster__mark--' + mark.kind;
    face.style.backgroundImage = "url('" + assetUrl(mark.img) + "')";
    el.appendChild(face);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', mark.label);
    return el;
  }

  /* =========================================================
     2. 拟邀参会企业 logo 墙（占位）
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
     2b. 手机号国家/地区区号
     —— 国际嘉宾号码位数不固定，前面单独选区号，号码本身不限位数。
        无需第三方库：维护一份常用区号清单即可，默认中国大陆 +86。
     ========================================================= */
  var COUNTRY_CODES = [
    { n: '中国大陆', d: '+86' }, { n: '中国香港', d: '+852' }, { n: '中国澳门', d: '+853' }, { n: '中国台湾', d: '+886' },
    { n: '日本', d: '+81' }, { n: '韩国', d: '+82' }, { n: '新加坡', d: '+65' }, { n: '马来西亚', d: '+60' },
    { n: '泰国', d: '+66' }, { n: '印度尼西亚', d: '+62' }, { n: '菲律宾', d: '+63' }, { n: '越南', d: '+84' },
    { n: '印度', d: '+91' }, { n: '巴基斯坦', d: '+92' }, { n: '孟加拉国', d: '+880' }, { n: '斯里兰卡', d: '+94' },
    { n: '尼泊尔', d: '+977' }, { n: '柬埔寨', d: '+855' }, { n: '缅甸', d: '+95' }, { n: '老挝', d: '+856' },
    { n: '文莱', d: '+673' }, { n: '蒙古', d: '+976' }, { n: '哈萨克斯坦', d: '+7' },
    { n: '阿联酋', d: '+971' }, { n: '沙特阿拉伯', d: '+966' }, { n: '卡塔尔', d: '+974' }, { n: '科威特', d: '+965' },
    { n: '巴林', d: '+973' }, { n: '阿曼', d: '+968' }, { n: '以色列', d: '+972' }, { n: '土耳其', d: '+90' },
    { n: '伊朗', d: '+98' }, { n: '伊拉克', d: '+964' }, { n: '约旦', d: '+962' }, { n: '黎巴嫩', d: '+961' },
    { n: '澳大利亚', d: '+61' }, { n: '新西兰', d: '+64' }, { n: '斐济', d: '+679' },
    { n: '美国', d: '+1' }, { n: '加拿大', d: '+1' }, { n: '墨西哥', d: '+52' },
    { n: '巴西', d: '+55' }, { n: '阿根廷', d: '+54' }, { n: '智利', d: '+56' }, { n: '哥伦比亚', d: '+57' },
    { n: '秘鲁', d: '+51' }, { n: '委内瑞拉', d: '+58' },
    { n: '英国', d: '+44' }, { n: '爱尔兰', d: '+353' }, { n: '法国', d: '+33' }, { n: '德国', d: '+49' },
    { n: '意大利', d: '+39' }, { n: '西班牙', d: '+34' }, { n: '葡萄牙', d: '+351' }, { n: '荷兰', d: '+31' },
    { n: '比利时', d: '+32' }, { n: '瑞士', d: '+41' }, { n: '奥地利', d: '+43' }, { n: '瑞典', d: '+46' },
    { n: '挪威', d: '+47' }, { n: '丹麦', d: '+45' }, { n: '芬兰', d: '+358' }, { n: '波兰', d: '+48' },
    { n: '捷克', d: '+420' }, { n: '匈牙利', d: '+36' }, { n: '希腊', d: '+30' }, { n: '罗马尼亚', d: '+40' },
    { n: '俄罗斯', d: '+7' }, { n: '乌克兰', d: '+380' }, { n: '卢森堡', d: '+352' }, { n: '冰岛', d: '+354' },
    { n: '埃及', d: '+20' }, { n: '南非', d: '+27' }, { n: '尼日利亚', d: '+234' }, { n: '肯尼亚', d: '+254' },
    { n: '摩洛哥', d: '+212' }, { n: '埃塞俄比亚', d: '+251' }, { n: '加纳', d: '+233' }, { n: '坦桑尼亚', d: '+255' }
  ];

  function buildPhoneCodes() {
    var opts = COUNTRY_CODES.map(function (c) {
      return '<option value="' + c.d + '">' + c.n + ' ' + c.d + '</option>';
    }).join('');
    ['f-phone-cc', 'n-phone-cc'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = opts;
      sel.value = '+86'; // 默认中国大陆
    });
  }

  // 取号码纯数字部分（去掉空格/连字符等）
  function phoneDigits(v) {
    return String(v || '').replace(/\D/g, '');
  }
  // 把区号与号码拼成入库格式：如 "+86 13800138000"
  function fullPhone(form) {
    var cc = form.phoneCc && form.phoneCc.value ? form.phoneCc.value : '+86';
    var ccDigits = cc.replace(/\D/g, '');
    var raw = String(form.phone.value || '').trim();
    var local;
    // 用户若把含区号的号码整段粘进来（+86.../0086...），剥掉国际前缀与重复区号，
    // 避免拼成 "+86 8613800138000"。只有明确以 + 或 00 开头才剥，不误伤国内号。
    if (/^(\+|00)/.test(raw)) {
      local = raw.replace(/^(\+|00)/, '').replace(/\D/g, '');
      if (ccDigits && local.indexOf(ccDigits) === 0) local = local.slice(ccDigits.length);
    } else {
      local = phoneDigits(raw);
    }
    return cc + ' ' + local;
  }

  /* =========================================================
     3. 议程时间线
     ========================================================= */
  var AGENDA = [
    { t: '13:00–14:00', title: 'Rising Leader 红毯互动体验' },
    { t: '14:00–14:15', title: '开幕致辞｜重新定义新一代管理者的成长路径', desc: '王梦妍 · PMI 中国区总裁' },
    { t: '14:15–14:30', title: '苏州市领导致辞' },
    { t: '14:30–14:50', title: '项目管理理念的时代演进', hot: true, desc: '《项目管理知识体系指南(PMBOK® 指南)第八版》发布仪式' },
    { t: '14:50–15:05', title: '主题演讲｜读懂商业与趋势，建立前瞻创新的第一步' },
    { t: '15:05–15:20', title: '主题演讲｜从交付到价值：新一代管理者的必修课' },
    { t: '15:20–15:35', title: '主题演讲｜没有标准答案，管理者如何做关键决策' },
    { t: '15:35–16:45', title: '2026 PMI 中国新锐项目管理精英奖颁奖仪式', hot: true },
    { t: '16:45–17:20', title: 'Fireside Chat｜他们是如何成长为新一代管理者的?', desc: '—— Rising Leader 获奖代表圆桌对话' },
    { t: '17:20–17:30', title: '大合影' },
    { t: '18:00–20:00', title: 'Rising Leader Night 新锐管理者交流晚宴（定向邀请）' }
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
    cert: { price: 799, channelPrice: 499, name: '持证人票' },
    noncert: { price: 999, channelPrice: 699, name: '非持证人票' },
    test: { price: 1, name: 'Test Ticket（支付测试）' },
    free: { price: 0, name: 'Invitation Ticket' }
  };

  // 邀请码免费票：填入下列邀请码即可解锁免费票并直接出票（大小写不敏感）
  var FREE_INVITE_CODES = ['PMI100'];
  function isFreeInvite(code) {
    return FREE_INVITE_CODES.indexOf(String(code || '').trim().toUpperCase()) !== -1;
  }

  // 测试票：仅邀请码 TEST 可解锁（大小写不敏感）
  var TEST_INVITE_CODE = 'TEST';
  function isTestInvite(code) {
    return String(code || '').trim().toUpperCase() === TEST_INVITE_CODE;
  }

  // 渠道码：确认后持证人/非持证人按渠道折扣价结算（与 api/order.js 保持一致）
  var CHANNEL_INVITE_CODES = ['QD2026'];
  function isChannelInvite(code) {
    return CHANNEL_INVITE_CODES.indexOf(String(code || '').trim().toUpperCase()) !== -1;
  }

  // 渠道折扣是否已生效（confirmInvite 设置，collect 读取）
  var channelApplied = false;

  // 票面价：渠道码生效时按渠道折扣价结算
  function effectivePrice(ticketKey) {
    var t = TICKETS[ticketKey] || TICKETS.cert;
    if (channelApplied && t.channelPrice) return t.channelPrice;
    return t.price;
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
    var testTicket = document.getElementById('ticketTest');
    var payWrap = document.getElementById('payWrap');
    var freeClaim = document.getElementById('freeClaim');
    var freeCodeLabel = document.getElementById('freeCodeLabel');
    var inviteOk = false;
    var inviteTestOk = false;

    function selectedVal() {
      var v = form.querySelector('input[name="ticket"]:checked');
      return v ? v.value : 'cert';
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

    // 渠道折扣：刷新票卡上的价格展示（原价划线 + 现价 + 提示行）
    function syncChannelDisplay() {
      Object.keys(TICKETS).forEach(function (key) {
        var t = TICKETS[key];
        if (!t.channelPrice) return;
        var card = form.querySelector('.ticket[data-ticket="' + key + '"]');
        if (!card) return;
        var orig = card.querySelector('[data-price-orig]');
        var cur = card.querySelector('[data-price-cur]');
        var line = card.querySelector('[data-channel-line]');
        if (orig) orig.hidden = !channelApplied;
        if (cur) cur.textContent = '¥' + (channelApplied ? t.channelPrice : t.price);
        if (line) {
          line.classList.toggle('ticket__channel--on', channelApplied);
          line.innerHTML = channelApplied
            ? '渠道折扣价 <b>¥' + t.channelPrice + '</b> · 渠道码已生效'
            : '渠道折扣价 <b>¥' + t.channelPrice + '</b> · 凭渠道码享受';
        }
      });
    }

    // 票种 → 合计金额 + 支付区 / 免费领取区切换
    function syncMode() {
      var val = selectedVal();
      var price = effectivePrice(val);
      if (totalEl) totalEl.textContent = price > 0 ? ('¥' + price) : '免费';
      var isFree = (val === 'free');
      if (payWrap) payWrap.hidden = isFree;
      if (freeClaim) freeClaim.hidden = !isFree;
      syncChannelDisplay();
    }

    var freeRadio = freeTicket ? freeTicket.querySelector('input[name="ticket"]') : null;
    var testRadio = testTicket ? testTicket.querySelector('input[name="ticket"]') : null;

    // 收起免费票（邀请码未确认 / 被改动时）
    function lockFree() {
      inviteOk = false;
      if (freeTicket) freeTicket.hidden = true;
      if (freeRadio) freeRadio.disabled = true;
      if (selectedVal() === 'free') selectTicket('cert');
      syncMode();
    }

    // 收起测试票
    function lockTest() {
      inviteTestOk = false;
      if (testTicket) testTicket.hidden = true;
      if (testRadio) testRadio.disabled = true;
      if (selectedVal() === 'test') selectTicket('cert');
      syncMode();
    }

    // 取消渠道折扣
    function lockChannel() {
      channelApplied = false;
      syncMode();
    }

    function lockInvites() {
      lockFree();
      lockTest();
      lockChannel();
    }

    // 点击「确认」才校验邀请码并解锁对应票种 / 折扣
    function confirmInvite() {
      var code = inviteEl ? inviteEl.value.trim() : '';
      if (!code) { lockInvites(); setInviteMsg('请输入邀请码或渠道码', 'err'); return; }
      if (isFreeInvite(code)) {
        lockTest();
        lockChannel();
        inviteOk = true;
        if (freeCodeLabel) freeCodeLabel.textContent = code.toUpperCase();
        if (freeTicket) freeTicket.hidden = false;
        if (freeRadio) freeRadio.disabled = false;
        selectTicket('free');
        setInviteMsg('邀请码有效，已为你解锁免费票', 'ok');
        syncMode();
      } else if (isTestInvite(code)) {
        lockFree();
        lockChannel();
        inviteTestOk = true;
        if (testTicket) testTicket.hidden = false;
        if (testRadio) testRadio.disabled = false;
        selectTicket('test');
        setInviteMsg('邀请码有效，已为你解锁测试票', 'ok');
        syncMode();
      } else if (isChannelInvite(code)) {
        lockFree();
        lockTest();
        channelApplied = true;
        if (selectedVal() !== 'cert' && selectedVal() !== 'noncert') selectTicket('cert');
        setInviteMsg('渠道码有效，已按渠道折扣价结算', 'ok');
        syncMode();
      } else {
        lockInvites();
        setInviteMsg('邀请码无效，请确认后重试', 'err');
      }
    }

    radios.forEach(function (r) { r.addEventListener('change', syncMode); });
    if (inviteBtn) inviteBtn.addEventListener('click', confirmInvite);
    if (inviteEl) {
      // 确认后再修改邀请码，需重新确认
      inviteEl.addEventListener('input', function () {
        if (inviteOk || inviteTestOk || channelApplied) lockInvites();
        setInviteMsg('', null);
      });
      inviteEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmInvite(); }
      });
    }
    lockInvites();
    syncMode();
  }

  var PAY_LABELS = { wxpay: '微信支付', alipay: '支付宝', free: '邀请码免费票' };

  /* =========================================================
     6. 表单校验 + 支付占位跳转（微信 / 支付宝）
     ========================================================= */
  // 注册须知：未勾选同意则拦截支付 / 领票
  function termsAgreed(form) {
    var agree = document.getElementById('regAgree');
    var err = document.getElementById('regAgreeErr');
    var ok = !!(agree && agree.checked);
    if (err) err.hidden = ok;
    if (!ok && agree) {
      var wrap = agree.closest('.reg__agree');
      if (wrap) {
        wrap.classList.add('is-invalid');
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return ok;
  }

  function initTerms() {
    var modal = document.getElementById('termsModal');
    var openLink = document.getElementById('termsOpen');
    var agreeBtn = document.getElementById('termsAgree');
    var agree = document.getElementById('regAgree');
    var err = document.getElementById('regAgreeErr');
    if (!modal) return;
    if (openLink) {
      openLink.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(modal);
      });
    }
    modal.querySelectorAll('[data-terms-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(modal); });
    });
    if (agreeBtn) {
      agreeBtn.addEventListener('click', function () {
        if (agree) {
          agree.checked = true;
          var wrap = agree.closest('.reg__agree');
          if (wrap) wrap.classList.remove('is-invalid');
        }
        if (err) err.hidden = true;
        closeModal(modal);
      });
    }
    if (agree) {
      agree.addEventListener('change', function () {
        var wrap = agree.closest('.reg__agree');
        if (agree.checked) {
          if (wrap) wrap.classList.remove('is-invalid');
          if (err) err.hidden = true;
        }
      });
    }
  }

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

    // 从 Z-Pay 未付款回退时，浏览器会恢复离开前的页面快照（遮罩仍显示），需手动关闭
    window.addEventListener('pageshow', function (e) {
      if (e.persisted && overlay) overlay.hidden = true;
    });

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
    if (!termsAgreed(form)) return;

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
    if (!termsAgreed(form)) return;
    if (!isFreeInvite(form.invite.value)) {
      window.alert('邀请码无效，请确认后重试');
      return;
    }

    var data = collect(form, 'free');

    if (overlay) {
      overlay.hidden = false;
      setOverlayTitle('正在为您准备门票…');
      if (overlayDetail) overlayDetail.textContent = data.ticketName + ' · 免费（邀请码） · 请稍候';
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
          ('/success?out_trade_no=' + encodeURIComponent(res.body.orderId));
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
      if (!invalid && (el.type === 'tel' || el.name === 'phone')) {
        var d = v.replace(/\D/g, ''); // 国际号码位数不固定，只校验为 4~15 位数字
        invalid = d.length < 4 || d.length > 15;
      }
      if (!invalid && (el.type === 'email' || el.name === 'email')) invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      el.classList.toggle('is-invalid', invalid);
      if (invalid) ok = false;
    });
    return ok;
  }

  function collect(form, payMethod) {
    var t = form.querySelector('input[name="ticket"]:checked');
    var ticket = t && TICKETS[t.value] ? t.value : 'cert';
    var ticketInfo = TICKETS[ticket] || TICKETS.cert;
    var method = payMethod === 'free' ? 'free' : (payMethod === 'alipay' ? 'alipay' : 'wxpay');
    return {
      name: form.name.value.trim(),
      nickname: form.nickname ? form.nickname.value.trim() : '',
      company: form.company.value.trim(),
      title: form.title.value.trim(),
      phone: fullPhone(form),
      email: form.email.value.trim(),
      wechat: form.wechat.value.trim(),
      industry: form.industry.value,
      invite: form.invite.value.trim(),
      ticket: ticket,
      ticketName: ticketInfo.name,
      price: effectivePrice(ticket),
      agreeTerms: true,
      payMethod: method,
      payMethodLabel: PAY_LABELS[method],
      orderId: 'RL2026-' + String(((phoneDigits(form.phone.value) || '000000').slice(-6)) + Math.floor(Date.now() % 10000)).padStart(10, '0')
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
        // 可能同时开多层弹窗（如 Nominee 弹窗内打开授权书），先关最上层
        var open = Array.prototype.slice.call(document.querySelectorAll('.modal:not([hidden])'));
        if (!open.length) return;
        open.sort(function (a, b) {
          return (parseInt(getComputedStyle(a).zIndex, 10) || 0) - (parseInt(getComputedStyle(b).zIndex, 10) || 0);
        });
        closeModal(open[open.length - 1]);
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
     11. 专属海报：前端把 AI 人像合成进透明模板
     ========================================================= */
  var POSTER_TEMPLATE_URL = 'assets/template-web.png';
  // 透明人像窗口比例（由 template.png alpha 检测：left 17.85%、bottom 63.78%）
  var POSTER_WIN_LEFT = 0.1785;
  var POSTER_WIN_BOTTOM = 0.6378;
  var POSTER_BASE_FILL = '#6d3fa0'; // 兜底紫，仅在模板透明缝隙处可见

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片加载失败')); };
      img.src = src;
    });
  }

  // object-fit: cover —— 把图片铺满目标矩形并居中裁剪
  function drawCover(ctx, img, dx, dy, dw, dh) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(dw / iw, dh / ih);
    var sw = dw / scale, sh = dh / scale;
    var sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  // 取人像「左上角一小块」的均值作兜底背景（即背景紫，而非整图平均色）
  function sampleCornerColor(img) {
    try {
      var c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      var x = c.getContext('2d');
      var sw = Math.min(24, img.naturalWidth || img.width || 1);
      var sh = Math.min(24, img.naturalHeight || img.height || 1);
      x.drawImage(img, 0, 0, sw, sh, 0, 0, 1, 1); // 源矩形只取左上角
      var d = x.getImageData(0, 0, 1, 1).data;
      return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
    } catch (e) { return POSTER_BASE_FILL; }
  }

  // 人像垫在窗口下方 + 叠加模板 → 返回合成后的 JPEG dataURL
  function buildPosterDataUrl(portraitDataUrl) {
    return Promise.all([loadImage(POSTER_TEMPLATE_URL), loadImage(portraitDataUrl)])
      .then(function (imgs) {
        var tpl = imgs[0], por = imgs[1];
        var W = tpl.naturalWidth, H = tpl.naturalHeight;
        var canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取画布上下文');
        var winLeft = Math.round(W * POSTER_WIN_LEFT);
        var winBottom = Math.round(H * POSTER_WIN_BOTTOM);
        ctx.fillStyle = sampleCornerColor(por);
        ctx.fillRect(0, 0, W, H);
        drawCover(ctx, por, winLeft, 0, W - winLeft, winBottom);
        ctx.drawImage(tpl, 0, 0, W, H);
        return canvas.toDataURL('image/jpeg', 0.95);
      });
  }

  /* =========================================================
     12. 第五屏 Nominee 获奖流程（多步弹窗）
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
      b.addEventListener('click', function () {
        resetPoster();
        show(1);
        syncInterviewCity(); // 重开弹窗时同步「所在城市」显隐，与已选项保持一致
        openModal(modal);
      });
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
          if (wrap) { wrap.classList.add('has-photo'); wrap.classList.remove('is-invalid'); }
        };
        reader.readAsDataURL(f);
      });
    }

    var uploadOverlay = document.getElementById('nomineeUploadOverlay');
    var uploadTitle = document.getElementById('nomineeUploadTitle');
    var uploadDetail = document.getElementById('nomineeUploadDetail');

    function setNomineeUploading(show, title, detail) {
      if (!uploadOverlay) return;
      uploadOverlay.hidden = !show;
      if (uploadTitle && title) uploadTitle.textContent = title;
      if (uploadDetail) uploadDetail.textContent = detail || '请稍候';
    }

    // ---- 专属海报状态机 ----
    var nomineeId = 0;
    var posterStarted = false;
    var nposter = document.getElementById('nposter');
    var nposterLoading = document.getElementById('nposterLoading');
    var nposterResult = document.getElementById('nposterResult');
    var nposterError = document.getElementById('nposterError');
    var nposterErrorMsg = document.getElementById('nposterErrorMsg');
    var nposterImg = document.getElementById('nposterImg');
    var nposterDownload = document.getElementById('nposterDownload');
    var nposterRetry = document.getElementById('nposterRetry');
    var nposterNophoto = document.getElementById('nposterNophoto');

    function showPosterState(state) {
      if (!nposter) return;
      nposter.hidden = false;
      if (nposterLoading) nposterLoading.hidden = state !== 'loading';
      if (nposterResult) nposterResult.hidden = state !== 'result';
      if (nposterError) nposterError.hidden = state !== 'error';
      if (nposterNophoto) nposterNophoto.hidden = state !== 'nophoto';
    }

    function resetPoster() {
      nomineeId = 0;
      posterStarted = false;
      if (nposter) nposter.hidden = true;
      if (nposterImg) nposterImg.removeAttribute('src');
    }

    function generatePoster() {
      if (!nomineeId || !nposter) return;
      showPosterState('loading');
      fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nomineeId })
      })
        .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, status: r.status, body: body }; }); })
        .then(function (res) {
          if (res.status === 422 && res.body && res.body.noPhoto) {
            showPosterState('nophoto'); // 未上传照片：给出明确提示
            return null;
          }
          if (!res.ok || !res.body.posterDataUrl) {
            throw new Error((res.body && res.body.error) || '生成失败');
          }
          return buildPosterDataUrl(res.body.posterDataUrl);
        })
        .then(function (finalUrl) {
          if (!finalUrl) return;
          if (nposterImg) nposterImg.src = finalUrl;
          if (nposterDownload) nposterDownload.href = finalUrl;
          showPosterState('result');
        })
        .catch(function (err) {
          if (nposterErrorMsg) nposterErrorMsg.textContent = (err && err.message) ? err.message : '网络波动，请重试一次';
          showPosterState('error');
        });
    }

    if (nposterRetry) {
      nposterRetry.addEventListener('click', function () { if (nomineeId) generatePoster(); });
    }

    // 接受拍摄选「是」时，弹出所在城市填写
    var interviewCityField = document.getElementById('interviewCityField');
    var interviewCityInput = document.getElementById('n-interview-city');
    var nform = document.getElementById('nomineeForm');

    function interviewVal() {
      return nform && nform.elements.interview ? String(nform.elements.interview.value || '') : '';
    }

    function syncInterviewCity() {
      if (!interviewCityField) return;
      var yes = interviewVal() === '是';
      interviewCityField.hidden = !yes;
      if (!yes && interviewCityInput) {
        interviewCityInput.value = '';
        interviewCityInput.classList.remove('is-invalid');
      }
    }

    if (nform) {
      nform.querySelectorAll('input[name="interview"], input[name="attend"]').forEach(function (r) {
        r.addEventListener('change', function () {
          var wrap = r.closest('.field--choice');
          if (wrap) wrap.classList.remove('is-invalid');
          syncInterviewCity();
        });
      });
    }

    var authBox = document.getElementById('n-auth');
    var authErr = document.getElementById('nAuthErr');

    function clearAuthError() {
      if (authErr) authErr.hidden = true;
      var wrap = authBox ? authBox.closest('.nform__agree') : null;
      if (wrap) wrap.classList.remove('is-invalid');
    }

    if (authBox) {
      authBox.addEventListener('change', function () {
        if (authBox.checked) clearAuthError();
      });
    }

    // 授权书弹窗：链接打开阅读，「我已阅读并同意」代为勾选
    var authModal = document.getElementById('authModal');
    var authOpen = document.getElementById('authOpen');
    var authModalAgree = document.getElementById('authModalAgree');
    if (authModal) {
      if (authOpen) {
        authOpen.addEventListener('click', function (e) {
          e.preventDefault(); // 同时阻止外层 label 联动勾选
          openModal(authModal);
        });
      }
      authModal.querySelectorAll('[data-auth-close]').forEach(function (el) {
        el.addEventListener('click', function () { closeModal(authModal); });
      });
      if (authModalAgree) {
        authModalAgree.addEventListener('click', function () {
          if (authBox) authBox.checked = true;
          clearAuthError();
          closeModal(authModal);
        });
      }
    }

    // 必选项（是/否、城市、授权书）校验，返回 true 表示通过
    function validateNomineeExtras() {
      var ok = true;
      var firstBad = null;
      ['attend', 'interview'].forEach(function (name) {
        var wrap = nform.querySelector('.field--choice[data-choice="' + name + '"]');
        var missing = !nform.elements[name] || !String(nform.elements[name].value || '');
        if (wrap) wrap.classList.toggle('is-invalid', missing);
        if (missing) { ok = false; firstBad = firstBad || wrap; }
      });
      if (interviewVal() === '是' && interviewCityInput && !interviewCityInput.value.trim()) {
        interviewCityInput.classList.add('is-invalid');
        ok = false;
        firstBad = firstBad || interviewCityInput;
      }
      var authMissing = !authBox || !authBox.checked;
      if (authErr) authErr.hidden = !authMissing;
      var authWrap = authBox ? authBox.closest('.nform__agree') : null;
      if (authWrap) authWrap.classList.toggle('is-invalid', authMissing);
      if (authMissing) { ok = false; firstBad = firstBad || authWrap; }
      if (!ok && firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return ok;
    }

    // 注册信息提交 → 入库 → 感谢页
    if (nform) {
      nform.addEventListener('submit', function (e) {
        e.preventDefault();
        // 照片必填
        var photoWrap = photo ? photo.closest('.photo-up') : null;
        var photoMissing = !photo || !photo.files || !photo.files[0];
        if (photoWrap) photoWrap.classList.toggle('is-invalid', photoMissing);
        var formOk = validate(nform);
        if (photoMissing || !formOk) {
          if (photoMissing && photoWrap) {
            photoWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            var firstErr = nform.querySelector('.field .is-invalid');
            if (firstErr) firstErr.focus();
          }
          return;
        }
        if (!validateNomineeExtras()) return;
        var submitBtn = nform.querySelector('[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        setNomineeUploading(true, '正在处理照片…', '大图会自动压缩，请稍候');

        compressNomineePhoto(photo)
          .then(function (photoData) {
            if (photoData.error) throw new Error(photoData.error);
            setNomineeUploading(true, '正在上传…', '请勿关闭页面');
            return fetch('/api/nominee', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: nform.name.value.trim(),
                nickname: nform.nickname ? nform.nickname.value.trim() : '',
                company: nform.company.value.trim(),
                title: nform.title.value.trim(),
                phone: fullPhone(nform),
                email: nform.email.value.trim(),
                wechat: nform.wechat ? nform.wechat.value.trim() : '',
                address: nform.address.value.trim(),
                attend_ceremony: String((nform.elements.attend && nform.elements.attend.value) || ''),
                accept_interview: interviewVal(),
                interview_city: interviewCityInput ? interviewCityInput.value.trim() : '',
                auth_agreed: !!(authBox && authBox.checked),
                photo_mime: photoData.photo_mime,
                photo_base64: photoData.photo_base64
              })
            });
          })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
          .then(function (res) {
            if (!res.ok || !res.body.ok) throw new Error((res.body && res.body.error) || '提交失败');
            nomineeId = Number(res.body.id || 0);
            show(4);
            if (nomineeId && !posterStarted) { posterStarted = true; generatePoster(); }
          })
          .catch(function (err) {
            window.alert(err.message || '提交失败，请稍后重试');
          })
          .finally(function () {
            setNomineeUploading(false);
            if (submitBtn) submitBtn.disabled = false;
          });
      });
      nform.addEventListener('input', function (e) {
        if (e.target.classList.contains('is-invalid')) e.target.classList.remove('is-invalid');
      });
    }
  }

  var NOMINEE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
  var NOMINEE_PHOTO_MAX_EDGE = 2400;
  var NOMINEE_JPEG_QUALITY = 0.82;
  var NOMINEE_JPEG_QUALITY_LOW = 0.72;

  function blobToBase64Payload(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        var parts = String(ev.target.result || '').split(',');
        resolve({
          photo_mime: 'image/jpeg',
          photo_base64: parts[1] || ''
        });
      };
      reader.onerror = function () { reject(new Error('照片读取失败')); };
      reader.readAsDataURL(blob);
    });
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', quality);
    });
  }

  function encodeNomineeCanvas(canvas) {
    return canvasToJpegBlob(canvas, NOMINEE_JPEG_QUALITY).then(function (blob) {
      if (blob && blob.size <= 3.2 * 1024 * 1024) return blob;
      return canvasToJpegBlob(canvas, NOMINEE_JPEG_QUALITY_LOW);
    });
  }

  function drawNomineeSourceToCanvas(source, width, height) {
    var canvas = document.createElement('canvas');
    var scale = Math.min(1, NOMINEE_PHOTO_MAX_EDGE / Math.max(width, height, 1));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    var ctx = canvas.getContext('2d');
    if (!ctx) return Promise.reject(new Error('照片处理失败'));
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return encodeNomineeCanvas(canvas);
  }

  function compressNomineePhoto(input) {
    return new Promise(function (resolve) {
      var f = input && input.files && input.files[0];
      if (!f) return resolve({ photo_mime: '', photo_base64: '' });
      if (f.size > NOMINEE_PHOTO_MAX_BYTES) {
        return resolve({ error: '照片请小于 10MB' });
      }
      if (!/^image\//i.test(f.type || '')) {
        return resolve({ error: '请上传图片文件' });
      }

      function done(blob) {
        if (!blob) return resolve({ error: '照片处理失败' });
        blobToBase64Payload(blob)
          .then(function (payload) { resolve(payload); })
          .catch(function (err) { resolve({ error: err.message || '照片读取失败' }); });
      }

      function fail() { resolve({ error: '照片读取失败' }); }

      if (window.createImageBitmap) {
        createImageBitmap(f, { imageOrientation: 'from-image' })
          .then(function (bitmap) {
            return drawNomineeSourceToCanvas(bitmap, bitmap.width, bitmap.height)
              .then(function (blob) {
                if (bitmap.close) bitmap.close();
                done(blob);
              });
          })
          .catch(function () { loadWithImage(); });
        return;
      }

      loadWithImage();

      function loadWithImage() {
        var url = URL.createObjectURL(f);
        var img = new Image();
        img.onload = function () {
          drawNomineeSourceToCanvas(img, img.naturalWidth, img.naturalHeight)
            .then(done)
            .catch(fail);
          URL.revokeObjectURL(url);
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          fail();
        };
        img.src = url;
      }
    });
  }

  /* =========================================================
     启动
     ========================================================= */
  function init() {
    buildPosterWall();
    buildLogoWall();
    buildPhoneCodes();
    buildAgenda();
    initNav();
    initTickets();
    initForm();
    initTerms();
    initModals();
    initBarrage();
    initNominee();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
