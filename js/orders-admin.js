(function () {
  'use strict';

  var STORAGE_KEY = 'nominee_admin_key';

  var gate = document.getElementById('ordAdminGate');
  var gateInput = document.getElementById('ordAdminKey');
  var gateHint = document.getElementById('ordAdminGateHint');
  var statusEl = document.getElementById('ordAdminStatus');
  var tableWrap = document.getElementById('ordAdminTableWrap');
  var tbody = document.getElementById('ordAdminTbody');

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
    tableWrap.hidden = true;
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

  function companyTitle(o) {
    var parts = [o.company, o.title].filter(Boolean);
    return parts.join(' · ');
  }

  function renderTable(items) {
    if (!items.length) {
      tableWrap.hidden = true;
      setStatus('暂无购票订单');
      return;
    }
    tableWrap.hidden = false;
    setStatus('共 ' + items.length + ' 条订单');
    tbody.innerHTML = items.map(function (o) {
      var statusClass = o.status === 'paid' ? 'ord-admin__pill--ok' : 'ord-admin__pill--pending';
      return (
        '<tr>' +
        '<td data-label="购票人"><span class="ord-admin__name">' + esc(o.name) + '</span>' +
        '<span class="ord-admin__pill ' + statusClass + '">' + esc(o.statusLabel) + '</span></td>' +
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

  function loadList(key) {
    saveKey(key);
    gate.hidden = true;
    setStatus('加载订单…');
    fetchJson('/api/orders-admin', key).then(function (result) {
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
      renderTable(result.data.orders || []);
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
