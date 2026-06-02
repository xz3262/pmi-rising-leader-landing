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

/** 写入数据库用：UTC ISO，避免 SQLite datetime 时区不准 */
function nowUtcIso() {
  return new Date().toISOString();
}

/**
 * 解析库里的时间：
 * - 带 Z / 时区偏移 → 按真实瞬间解析
 * - 旧数据无偏移 → 按 UTC 理解（Turso 默认 datetime('now')）
 */
function parseStoredInstant(value) {
  if (!value) return null;
  var s = String(value).trim();
  if (!s) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
    var parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  var legacy = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(legacy.getTime()) ? null : legacy;
}

function formatStoredChina(value) {
  var instant = parseStoredInstant(value);
  if (!instant) return value || null;
  return formatInstantChina(instant);
}

module.exports = {
  nowUtcIso,
  formatStoredChina,
  parseStoredInstant,
  formatInstantChina
};
