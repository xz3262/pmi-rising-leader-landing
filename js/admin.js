(function () {
  'use strict';

  var STORAGE_KEY = 'nominee_admin_key';
  var VALID_TABS = { nominees: true, orders: true };

  var gate = document.getElementById('adminGate');
  var gateInput = document.getElementById('adminKey');
  var gateHint = document.getElementById('adminGateHint');
  var tabsNav = document.getElementById('adminTabs');
  var panelNominees = document.getElementById('adminPanelNominees');
  var panelOrders = document.getElementById('adminPanelOrders');
  var statusNominees = document.getElementById('adminStatusNominees');
  var statusOrders = document.getElementById('adminStatusOrders');
  var listEl = document.getElementById('nomAdminList');
  var tableWrap = document.getElementById('ordAdminTableWrap');
  var tbody = document.getElementById('ordAdminTbody');
  var detailEl = document.getElementById('nomAdminDetail');
  var detailTitle = document.getElementById('nomAdminDetailTitle');
  var detailPhoto = document.getElementById('nomAdminDetailPhoto');
  var detailImg = document.getElementById('nomAdminDetailImg');
  var detailPosterWrap = document.getElementById('nomAdminDetailPosterWrap');
  var detailPoster = document.getElementById('nomAdminDetailPoster');
  var detailRows = document.getElementById('nomAdminDetailRows');
  var detailLoadFull = document.getElementById('nomAdminLoadFull');
  var detailId = 0;

  var currentKey = '';
  var activeTab = 'nominees';
  var loaded = { nominees: false, orders: false };

  function getKeyFromUrl() {
    try {
      return String(new URLSearchParams(window.location.search).get('key') || '').trim();
    } catch (e) {
      return '';
    }
  }

  function getTabFromUrl() {
    try {
      var tab = String(new URLSearchParams(window.location.search).get('tab') || '').trim();
      return VALID_TABS[tab] ? tab : 'nominees';
    } catch (e) {
      return 'nominees';
    }
  }

  function getStoredKey() {
    try {
      return String(sessionStorage.getItem(STORAGE_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function saveKey(key) {
    try {
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch (e) { /* ignore */ }
  }

  function updateUrlTab(tab) {
    try {
      var params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      var qs = params.toString();
      var next = window.location.pathname + (qs ? '?' + qs : '');
      history.replaceState(null, '', next);
    } catch (e) { /* ignore */ }
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function apiUrl(path, key) {
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(key);
  }

  function fetchJson(url, key) {
    return fetch(apiUrl(url, key), {
      headers: { 'X-Nominee-Admin-Key': key }
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function rowHtml(label, value) {
    if (!value) return '';
    return (
      '<div class="verify__row">' +
      '<div class="verify__k">' + esc(label) + '</div>' +
      '<div class="verify__v">' + esc(value) + '</div>' +
      '</div>'
    );
  }

  // 长文本行（保留换行，用于开放题答案）
  function rowHtmlLong(label, value) {
    if (!value) return '';
    return (
      '<div class="verify__row">' +
      '<div class="verify__k">' + esc(label) + '</div>' +
      '<div class="verify__v verify__v--pre">' + esc(value) + '</div>' +
      '</div>'
    );
  }

  /* ---- 最终海报合成（与 js/main.js 保持一致）：老记录无存档时现场合成并回填 ---- */
  var POSTER_TEMPLATE_URL = '/assets/template-web.png';
  var POSTER_WIN_LEFT = 0.1785;
  var POSTER_WIN_BOTTOM = 0.6378;
  var POSTER_BASE_FILL = '#6d3fa0';
  var POSTER_ARCHIVE_MAX_W = 1080;

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片加载失败')); };
      img.src = src;
    });
  }

  function drawCover(ctx, img, dx, dy, dw, dh) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(dw / iw, dh / ih);
    var sw = dw / scale, sh = dh / scale;
    var sx = (iw - sw) / 2, sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function sampleCornerColor(img) {
    try {
      var c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      var x = c.getContext('2d');
      var sw = Math.min(24, img.naturalWidth || img.width || 1);
      var sh = Math.min(24, img.naturalHeight || img.height || 1);
      x.drawImage(img, 0, 0, sw, sh, 0, 0, 1, 1);
      var d = x.getImageData(0, 0, 1, 1).data;
      return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
    } catch (e) { return POSTER_BASE_FILL; }
  }

  function composeFinalPoster(portraitDataUrl) {
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

  // 现场合成后的海报回填存档（缩到 1080 宽控制体积），失败静默
  function archiveFinalPoster(id, dataUrl) {
    if (!id || !dataUrl) return;
    loadImage(dataUrl)
      .then(function (img) {
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        var scale = Math.min(1, POSTER_ARCHIVE_MAX_W / (w || 1));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法获取画布上下文');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      })
      .then(function (archiveUrl) {
        return fetch('/api/poster', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Nominee-Admin-Key': currentKey
          },
          body: JSON.stringify({ id: id, finalPoster: archiveUrl })
        });
      })
      .catch(function () { /* 回填失败不影响展示 */ });
  }

  function showGate(message) {
    gate.hidden = false;
    tabsNav.hidden = true;
    panelNominees.hidden = true;
    panelOrders.hidden = true;
    if (message) {
      gateHint.hidden = false;
      gateHint.textContent = message;
    } else {
      gateHint.hidden = true;
      gateHint.textContent = '';
    }
  }

  function showApp() {
    gate.hidden = true;
    tabsNav.hidden = false;
    setActiveTab(activeTab, false);
  }

  function setActiveTab(tab, updateUrl) {
    activeTab = VALID_TABS[tab] ? tab : 'nominees';
    if (updateUrl !== false) updateUrlTab(activeTab);

    tabsNav.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-admin-tab') === activeTab);
    });

    panelNominees.hidden = activeTab !== 'nominees';
    panelOrders.hidden = activeTab !== 'orders';

    if (currentKey && !loaded[activeTab]) {
      if (activeTab === 'nominees') loadNominees(currentKey);
      else loadOrders(currentKey);
    }
  }

  function handleAuthError(result) {
    if (result.status === 401) {
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      currentKey = '';
      loaded.nominees = false;
      loaded.orders = false;
      showGate(result.data && result.data.error ? result.data.error : '密钥无效');
      return null;
    }
    if (result.status === 503) {
      showGate((result.data && result.data.error) || '服务未配置密钥');
      return null;
    }
    return (result.data && result.data.error) || '加载失败';
  }

  function renderNominees(items) {
    if (!items.length) {
      listEl.hidden = true;
      statusNominees.textContent = '暂无得奖人提交记录';
      return;
    }
    listEl.hidden = false;
    statusNominees.textContent = '共 ' + items.length + ' 条';
    listEl.innerHTML = items.map(function (n) {
      var sub = [n.company, n.title].filter(Boolean).join(' · ');
      var photoTag = n.hasPhoto
        ? '<span class="nom-admin__tag">有照片</span>'
        : '<span class="nom-admin__tag nom-admin__tag--muted">无照片</span>';
      var posterTag = n.hasFinalPoster
        ? '<span class="nom-admin__tag">有海报</span>'
        : (n.hasPoster ? '<span class="nom-admin__tag">有人像</span>' : '');
      return (
        '<button type="button" class="nom-admin__card" data-nominee-id="' + n.id + '">' +
        '<div class="nom-admin__card-top">' +
        '<strong>' + esc(n.name) + '</strong>' + photoTag + posterTag +
        '</div>' +
        (sub ? '<div class="nom-admin__card-sub">' + esc(sub) + '</div>' : '') +
        '<div class="nom-admin__card-meta">' + esc(n.createdAt || '') + '</div>' +
        '</button>'
      );
    }).join('');

    listEl.querySelectorAll('[data-nominee-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openNomineeDetail(Number(btn.getAttribute('data-nominee-id')));
      });
    });
  }

  function loadNominees(key) {
    statusNominees.textContent = '加载中…';
    fetchJson('/api/nominees', key).then(function (result) {
      if (!result.ok) {
        var err = handleAuthError(result);
        if (err != null) statusNominees.textContent = err;
        return;
      }
      loaded.nominees = true;
      renderNominees(result.data.nominees || []);
    }).catch(function () {
      statusNominees.textContent = '网络错误，请稍后重试';
    });
  }

  function openNomineeDetail(id) {
    if (!currentKey) return showGate('请先输入密钥');
    statusNominees.textContent = '加载详情…';
    fetchJson('/api/nominees?id=' + id, currentKey).then(function (result) {
      if (!result.ok) {
        var err = handleAuthError(result);
        if (err != null) statusNominees.textContent = err;
        return;
      }
      var n = result.data.nominee;
      if (!n) {
        statusNominees.textContent = '记录不存在';
        return;
      }
      detailTitle.textContent = n.name || '得奖人详情';
      detailId = n.id;
      // 默认只显示缩略图（几十 KB），原图/海报点按钮再拉，跨境链路下明显更快
      if (n.thumbDataUrl) {
        detailPhoto.hidden = false;
        detailImg.src = n.thumbDataUrl;
      } else {
        detailPhoto.hidden = true;
        detailImg.removeAttribute('src');
      }
      if (detailPosterWrap && detailPoster) {
        detailPosterWrap.hidden = true;
        detailPoster.removeAttribute('src');
      }
      if (detailLoadFull) {
        var hasPosterAny = n.hasFinalPoster || n.hasPoster;
        detailLoadFull.hidden = !(n.hasPhoto || hasPosterAny);
        detailLoadFull.disabled = false;
        detailLoadFull.textContent = hasPosterAny ? '查看原图与海报' : '查看原图';
      }
      detailRows.innerHTML = [
        rowHtml('姓名', n.name),
        rowHtml('昵称', n.nickname),
        rowHtml('公司', n.company),
        rowHtml('职务', n.title),
        rowHtml('手机', n.phone),
        rowHtml('邮箱', n.email),
        rowHtml('微信', n.wechat),
        rowHtml('收件地址', n.address),
        rowHtml('现场领奖', n.attendCeremony),
        rowHtml('前期采访拍摄', n.acceptInterview === '是' && n.interviewCity
          ? n.acceptInterview + '（' + n.interviewCity + '）'
          : n.acceptInterview),
        rowHtml('典礼期间拍摄', n.acceptCeremonyInterview),
        rowHtmlLong('最自豪的管理决策', n.proudDecision),
        rowHtmlLong('解决过最复杂的问题', n.complexProblem),
        rowHtmlLong('一句话介绍自己', n.oneLineIntro),
        rowHtml('能力标签', n.abilityTag),
        rowHtml('入场票号', n.ticketOrderNo),
        rowHtml('授权书', n.authAgreed ? '已同意' : ''),
        rowHtml('提交时间', n.createdAt)
      ].join('');
      detailEl.hidden = false;
      document.body.classList.add('nom-admin-detail-open');
      statusNominees.textContent = '共 ' + (listEl.querySelectorAll('.nom-admin__card').length || 0) + ' 条';
    }).catch(function () {
      statusNominees.textContent = '网络错误，请稍后重试';
    });
  }

  function closeDetail() {
    detailEl.hidden = true;
    document.body.classList.remove('nom-admin-detail-open');
    detailImg.removeAttribute('src');
    if (detailPoster) detailPoster.removeAttribute('src');
    detailId = 0;
    if (detailLoadFull) detailLoadFull.hidden = true;
  }

  // 按需加载原图与海报（full=1 返回完整 base64，可能数 MB）
  if (detailLoadFull) {
    detailLoadFull.addEventListener('click', function () {
      if (!detailId || !currentKey) return;
      var id = detailId;
      detailLoadFull.disabled = true;
      detailLoadFull.textContent = '加载中…';
      fetchJson('/api/nominees?id=' + id + '&full=1', currentKey).then(function (result) {
        if (id !== detailId) return; // 详情已切换或关闭
        if (!result.ok) {
          var err = handleAuthError(result);
          detailLoadFull.disabled = false;
          detailLoadFull.textContent = err != null ? (err + '，点击重试') : '查看原图与海报';
          return;
        }
        var n = result.data.nominee || {};
        if (n.photoDataUrl) {
          detailPhoto.hidden = false;
          detailImg.src = n.photoDataUrl;
        }
        if (detailPosterWrap && detailPoster) {
          if (n.finalPosterDataUrl) {
            // 优先展示存档的最终海报（用户实际拿到的那张）
            detailPosterWrap.hidden = false;
            detailPoster.src = n.finalPosterDataUrl;
          } else if (n.posterDataUrl) {
            // 老记录只有 AI 人像：按同一算法现场合成最终海报，并回填存档
            composeFinalPoster(n.posterDataUrl).then(function (finalUrl) {
              if (id !== detailId) return;
              detailPosterWrap.hidden = false;
              detailPoster.src = finalUrl;
              archiveFinalPoster(id, finalUrl);
            }).catch(function () {
              if (id !== detailId) return;
              // 模板加载失败等：退回展示 AI 人像
              detailPosterWrap.hidden = false;
              detailPoster.src = n.posterDataUrl;
            });
          }
        }
        detailLoadFull.hidden = true;
      }).catch(function () {
        detailLoadFull.disabled = false;
        detailLoadFull.textContent = '网络错误，点击重试';
      });
    });
  }

  detailEl.querySelectorAll('[data-nom-admin-close]').forEach(function (el) {
    el.addEventListener('click', closeDetail);
  });

  function companyTitle(o) {
    return [o.company, o.title].filter(Boolean).join(' · ');
  }

  /* ---- 订单：搜索 + 列表 + 详情（含入场二维码） ---- */
  var ordersData = [];
  var ordSearch = document.getElementById('ordAdminSearch');
  var ordHint = document.getElementById('ordAdminHint');
  var ordDetail = document.getElementById('ordAdminDetail');
  var ordDetailTitle = document.getElementById('ordAdminDetailTitle');
  var ordDetailQrWrap = document.getElementById('ordAdminDetailQrWrap');
  var ordDetailQr = document.getElementById('ordAdminDetailQr');
  var ordDetailRows = document.getElementById('ordAdminDetailRows');
  var ordDetailOrderNo = '';

  // 核票场景：按姓名为主，同时支持手机/邮箱/公司/订单号模糊匹配
  function filterOrders(items, query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(function (o) {
      return [o.name, o.nickname, o.phone, o.email, o.company, o.merchantOrderNo]
        .some(function (v) { return String(v || '').toLowerCase().indexOf(q) !== -1; });
    });
  }

  function orderVerifyUrl(o) {
    return o.verifyUrl || (window.location.origin + '/v/' + encodeURIComponent(o.merchantOrderNo));
  }

  function openOrderDetail(o) {
    if (!ordDetail) return;
    ordDetailTitle.textContent = (o.name || '订单详情') + (o.ticketName ? ' · ' + o.ticketName : '');
    var verifyUrl = orderVerifyUrl(o);
    ordDetailOrderNo = o.merchantOrderNo || '';
    if (ordDetailQrWrap && ordDetailQr) {
      if (o.merchantOrderNo) {
        // 先即时按存档链接渲染，再换成库里存档的二维码图片（内容一致，换图无感）
        ordDetailQr.src = '/api/qr?w=440&data=' + encodeURIComponent(verifyUrl);
        ordDetailQrWrap.hidden = false;
        loadArchivedQr(o.merchantOrderNo);
      } else {
        ordDetailQrWrap.hidden = true;
        ordDetailQr.removeAttribute('src');
      }
    }
    var badge = o.statusBadge || {};
    ordDetailRows.innerHTML = [
      rowHtml('姓名', o.name),
      rowHtml('昵称', o.nickname),
      rowHtml('公司', o.company),
      rowHtml('职务', o.title),
      rowHtml('手机', o.phone),
      rowHtml('邮箱', o.email),
      rowHtml('微信', o.wechat),
      rowHtml('行业', o.industry),
      rowHtml('票种', o.ticketName),
      rowHtml('类型', o.ticketType),
      rowHtml('金额', o.amountLabel),
      rowHtml('状态', badge.label || o.status),
      rowHtml('支付方式', o.payMethodLabel),
      rowHtml('邀请码 / 渠道码', o.invite),
      rowHtml('订单号', o.merchantOrderNo),
      rowHtml('平台交易号', o.transactionNo),
      rowHtml('已验票次数', String(o.verifyCount || 0) + ' 次'),
      rowHtml('下单时间', o.createdAt),
      rowHtml('支付时间', o.paidAt),
      // 纯文本展示：验票页打开即记一次验票，做成链接会被随手点击污染核票计数
      rowHtml('验票链接', verifyUrl)
    ].join('');
    ordDetail.hidden = false;
    document.body.classList.add('nom-admin-detail-open');
  }

  // 拉取库里存档的二维码图片（缺档时服务端会按存档链接自愈补档）
  function loadArchivedQr(orderNo) {
    if (!currentKey) return;
    fetchJson('/api/orders-admin?order=' + encodeURIComponent(orderNo), currentKey).then(function (result) {
      if (ordDetailOrderNo !== orderNo) return; // 详情已切换或关闭
      var detail = result.ok && result.data && result.data.order;
      if (detail && detail.qrDataUrl && ordDetailQr) {
        ordDetailQr.src = detail.qrDataUrl;
      }
    }).catch(function () { /* 拉取失败保留实时渲染的二维码 */ });
  }

  function closeOrderDetail() {
    if (!ordDetail) return;
    ordDetail.hidden = true;
    document.body.classList.remove('nom-admin-detail-open');
    ordDetailOrderNo = '';
    if (ordDetailQr) ordDetailQr.removeAttribute('src');
  }

  if (ordDetail) {
    ordDetail.querySelectorAll('[data-ord-admin-close]').forEach(function (el) {
      el.addEventListener('click', closeOrderDetail);
    });
  }

  function renderOrders(items) {
    var total = ordersData.length;
    var filtered = String(ordSearch && ordSearch.value || '').trim() !== '';
    if (ordHint) ordHint.hidden = !total;
    if (!items.length) {
      tableWrap.hidden = true;
      statusOrders.textContent = filtered
        ? '共 ' + total + ' 条订单 · 无匹配结果'
        : '暂无已出票订单';
      return;
    }
    tableWrap.hidden = false;
    statusOrders.textContent = filtered
      ? '共 ' + total + ' 条订单 · 匹配 ' + items.length + ' 条'
      : '共 ' + items.length + ' 条订单';
    tbody.innerHTML = items.map(function (o, i) {
      var badge = o.statusBadge || {};
      var badgeHtml = '';
      if (badge.show && badge.label) {
        var variant = badge.variant === 'invite' ? 'invite' : 'paid';
        badgeHtml = '<span class="ord-admin__pill ord-admin__pill--' + variant + '">' + esc(badge.label) + '</span>';
      }
      return (
        '<tr data-order-index="' + i + '">' +
        '<td data-label="购票人"><div class="ord-admin__name-cell">' +
        '<span class="ord-admin__name">' + esc(o.name) + '</span>' + badgeHtml + '</div></td>' +
        '<td data-label="公司 · 岗位">' + esc(companyTitle(o)) + '</td>' +
        '<td data-label="手机">' + esc(o.phone) + '</td>' +
        '<td data-label="邮箱">' + esc(o.email) + '</td>' +
        '<td data-label="票种">' + esc(o.ticketName) + '</td>' +
        '<td data-label="类型">' + esc(o.ticketType) + '</td>' +
        '<td data-label="金额">' + esc(o.amountLabel) + '</td>' +
        '<td data-label="验票">' + esc(String(o.verifyCount || 0) + ' 次') + '</td>' +
        '<td data-label="购买时间">' + esc(o.purchasedAt) + '</td>' +
        '<td data-label="订单号"><span class="ord-admin__mono">' + esc(o.merchantOrderNo) + '</span></td>' +
        '</tr>'
      );
    }).join('');

    tbody.querySelectorAll('[data-order-index]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var o = items[Number(tr.getAttribute('data-order-index'))];
        if (o) openOrderDetail(o);
      });
    });
  }

  if (ordSearch) {
    ordSearch.addEventListener('input', function () {
      if (!loaded.orders) return;
      renderOrders(filterOrders(ordersData, ordSearch.value));
    });
  }

  function loadOrders(key) {
    statusOrders.textContent = '加载中…';
    fetchJson('/api/orders-admin', key).then(function (result) {
      if (!result.ok) {
        var err = handleAuthError(result);
        if (err != null) statusOrders.textContent = err;
        return;
      }
      loaded.orders = true;
      ordersData = result.data.orders || [];
      renderOrders(filterOrders(ordersData, ordSearch ? ordSearch.value : ''));
    }).catch(function () {
      statusOrders.textContent = '网络错误，请稍后重试';
    });
  }

  function enterWithKey(key) {
    currentKey = key;
    saveKey(key);
    loaded.nominees = false;
    loaded.orders = false;
    showApp();
    if (activeTab === 'orders') loadOrders(key);
    else loadNominees(key);
  }

  tabsNav.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveTab(btn.getAttribute('data-admin-tab'));
    });
  });

  gate.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = String(gateInput.value || '').trim();
    if (!key) {
      gateHint.hidden = false;
      gateHint.textContent = '请输入密钥';
      return;
    }
    enterWithKey(key);
  });

  activeTab = getTabFromUrl();
  var initialKey = getKeyFromUrl() || getStoredKey();
  if (initialKey) {
    if (getKeyFromUrl()) saveKey(initialKey);
    enterWithKey(initialKey);
  } else {
    showGate();
  }
})();
