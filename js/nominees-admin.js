(function () {
  'use strict';

  var STORAGE_KEY = 'nominee_admin_key';

  var gate = document.getElementById('nomAdminGate');
  var gateInput = document.getElementById('nomAdminKey');
  var gateHint = document.getElementById('nomAdminGateHint');
  var statusEl = document.getElementById('nomAdminStatus');
  var listEl = document.getElementById('nomAdminList');
  var detailEl = document.getElementById('nomAdminDetail');
  var detailTitle = document.getElementById('nomAdminDetailTitle');
  var detailPhoto = document.getElementById('nomAdminDetailPhoto');
  var detailImg = document.getElementById('nomAdminDetailImg');
  var detailRows = document.getElementById('nomAdminDetailRows');

  function getKeyFromUrl() {
    try {
      return String(new URLSearchParams(window.location.search).get('key') || '').trim();
    } catch (e) {
      return '';
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

  function getAdminKey() {
    return getKeyFromUrl() || getStoredKey();
  }

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function showGate(message) {
    gate.hidden = false;
    listEl.hidden = true;
    if (message) {
      gateHint.hidden = false;
      gateHint.textContent = message;
    } else {
      gateHint.hidden = true;
      gateHint.textContent = '';
    }
    setStatus('');
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

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  function renderList(items) {
    if (!items.length) {
      listEl.hidden = true;
      setStatus('暂无 Nominee 提交记录');
      return;
    }
    listEl.hidden = false;
    setStatus('共 ' + items.length + ' 条');
    listEl.innerHTML = items.map(function (n) {
      var sub = [n.company, n.title].filter(Boolean).join(' · ');
      var photoTag = n.hasPhoto ? '<span class="nom-admin__tag">有照片</span>' : '<span class="nom-admin__tag nom-admin__tag--muted">无照片</span>';
      return (
        '<button type="button" class="nom-admin__card" data-nominee-id="' + n.id + '">' +
        '<div class="nom-admin__card-top">' +
        '<strong>' + esc(n.name) + '</strong>' + photoTag +
        '</div>' +
        (sub ? '<div class="nom-admin__card-sub">' + esc(sub) + '</div>' : '') +
        '<div class="nom-admin__card-meta">' + esc(n.createdAt || '') + '</div>' +
        '</button>'
      );
    }).join('');

    listEl.querySelectorAll('[data-nominee-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDetail(Number(btn.getAttribute('data-nominee-id')));
      });
    });
  }

  function openDetail(id) {
    var key = getAdminKey();
    if (!key) return showGate('请先输入密钥');
    setStatus('加载详情…');
    fetchJson('/api/nominees?id=' + id, key).then(function (result) {
      if (!result.ok) {
        if (result.status === 401) {
          try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
          return showGate(result.data && result.data.error ? result.data.error : '密钥无效');
        }
        setStatus((result.data && result.data.error) || '加载失败');
        return;
      }
      var n = result.data.nominee;
      if (!n) {
        setStatus('记录不存在');
        return;
      }
      detailTitle.textContent = n.name || 'Nominee 详情';
      if (n.photoDataUrl) {
        detailPhoto.hidden = false;
        detailImg.src = n.photoDataUrl;
      } else {
        detailPhoto.hidden = true;
        detailImg.removeAttribute('src');
      }
      detailRows.innerHTML = [
        rowHtml('昵称', n.nickname),
        rowHtml('公司', n.company),
        rowHtml('职务', n.title),
        rowHtml('手机', n.phone),
        rowHtml('邮箱', n.email),
        rowHtml('微信', n.wechat),
        rowHtml('收件地址', n.address),
        rowHtml('提交时间', n.createdAt)
      ].join('');
      detailEl.hidden = false;
      document.body.classList.add('nom-admin-detail-open');
      setStatus('共 ' + (listEl.querySelectorAll('.nom-admin__card').length || 0) + ' 条');
    }).catch(function () {
      setStatus('网络错误，请稍后重试');
    });
  }

  function closeDetail() {
    detailEl.hidden = true;
    document.body.classList.remove('nom-admin-detail-open');
    detailImg.removeAttribute('src');
  }

  detailEl.querySelectorAll('[data-nom-admin-close]').forEach(function (el) {
    el.addEventListener('click', closeDetail);
  });

  function loadList(key) {
    saveKey(key);
    gate.hidden = true;
    setStatus('加载列表…');
    fetchJson('/api/nominees', key).then(function (result) {
      if (!result.ok) {
        if (result.status === 401) {
          try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
          return showGate(result.data && result.data.error ? result.data.error : '密钥无效');
        }
        if (result.status === 503) {
          return showGate((result.data && result.data.error) || '服务未配置密钥');
        }
        setStatus((result.data && result.data.error) || '加载失败');
        return;
      }
      renderList(result.data.nominees || []);
    }).catch(function () {
      setStatus('网络错误，请稍后重试');
    });
  }

  gate.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = String(gateInput.value || '').trim();
    if (!key) {
      gateHint.hidden = false;
      gateHint.textContent = '请输入密钥';
      return;
    }
    loadList(key);
  });

  var initialKey = getAdminKey();
  if (initialKey) {
    if (getKeyFromUrl()) saveKey(initialKey);
    loadList(initialKey);
  } else {
    showGate();
  }
})();
