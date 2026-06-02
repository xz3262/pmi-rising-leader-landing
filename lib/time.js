'use strict';

var TZ = 'Asia/Shanghai';

function formatInstantChina(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

/** 写入数据库：北京时间 YYYY-MM-DD HH:MM:SS（与 Turso 控制台一致） */
function nowChinaSql() {
  var d = new Date();
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  function part(type) {
    var hit = parts.find(function (p) { return p.type === type; });
    return hit ? hit.value : '';
  }

  return part('year') + '-' + part('month') + '-' + part('day') + ' ' +
    part('hour') + ':' + part('minute') + ':' + part('second');
}

/**
 * 解析库里的时间：
 * - 带 Z / 时区偏移 → 按真实瞬间解析
 * - 无偏移 → 已是北京时间（SQLite datetime('now','+8 hours') 或 nowChinaSql）
 */
function parseStoredInstant(value) {
  if (!value) return null;
  var s = String(value).trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    var parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  var normalized = s.replace(' ', 'T').slice(0, 19);
  var china = new Date(normalized + '+08:00');
  return isNaN(china.getTime()) ? null : china;
}

function formatStoredChina(value) {
  var instant = parseStoredInstant(value);
  if (!instant) return value || null;
  return formatInstantChina(instant);
}

module.exports = {
  nowChinaSql,
  formatStoredChina,
  parseStoredInstant,
  formatInstantChina
};
