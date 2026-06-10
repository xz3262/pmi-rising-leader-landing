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
      var posterTag = n.hasPoster ? '<span class="nom-admin__tag">有海报</span>' : '';
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
        detailLoadFull.hidden = !(n.hasPhoto || n.hasPoster);
        detailLoadFull.disabled = false;
        detailLoadFull.textContent = n.hasPoster ? '查看原图与海报' : '查看原图';
      }
      detailRows.innerHTML = [
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
        if (detailPosterWrap && detailPoster && n.posterDataUrl) {
          detailPosterWrap.hidden = false;
          detailPoster.src = n.posterDataUrl;
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

  function renderOrders(items) {
    if (!items.length) {
      tableWrap.hidden = true;
      statusOrders.textContent = '暂无已出票订单';
      return;
    }
    tableWrap.hidden = false;
    statusOrders.textContent = '共 ' + items.length + ' 条订单';
    tbody.innerHTML = items.map(function (o) {
      var badge = o.statusBadge || {};
      var badgeHtml = '';
      if (badge.show && badge.label) {
        var variant = badge.variant === 'invite' ? 'invite' : 'paid';
        badgeHtml = '<span class="ord-admin__pill ord-admin__pill--' + variant + '">' + esc(badge.label) + '</span>';
      }
      return (
        '<tr>' +
        '<td data-label="购票人"><div class="ord-admin__name-cell">' +
        '<span class="ord-admin__name">' + esc(o.name) + '</span>' + badgeHtml + '</div></td>' +
        '<td data-label="公司 · 岗位">' + esc(companyTitle(o)) + '</td>' +
        '<td data-label="票种">' + esc(o.ticketName) + '</td>' +
        '<td data-label="类型">' + esc(o.ticketType) + '</td>' +
        '<td data-label="金额">' + esc(o.amountLabel) + '</td>' +
        '<td data-label="购买时间">' + esc(o.purchasedAt) + '</td>' +
        '<td data-label="订单号"><span class="ord-admin__mono">' + esc(o.merchantOrderNo) + '</span></td>' +
        '</tr>'
      );
    }).join('');
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
      renderOrders(result.data.orders || []);
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
