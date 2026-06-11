const { createClient } = require('@libsql/client');
const { env } = require('./zpay');
const { nowChinaSql } = require('./time');

var client = null;
var ready = false;
var BEIJING_NOW = "datetime('now', '+8 hours')";

function getClient() {
  if (client) return client;
  var url = env('TURSO_DATABASE_URL');
  var authToken = env('TURSO_AUTH_TOKEN');
  if (!url || !authToken) {
    throw new Error('缺少 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN');
  }
  client = createClient({ url: url, authToken: authToken });
  return client;
}

async function getTableColumns(db, table) {
  var result = await db.execute('PRAGMA table_info(' + table + ')');
  return result.rows.map(function (row) {
    return String(row.name || row[1] || '');
  });
}

async function addColumnIfMissing(db, table, column, definition) {
  try {
    await db.execute('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);
  } catch (err) {
    var msg = String(err.message || err);
    if (msg.indexOf('duplicate column') === -1 && msg.indexOf('already exists') === -1) {
      throw err;
    }
  }
}

async function renameColumnIfExists(db, table, oldName, newName) {
  if (oldName === newName) return;
  var columns = await getTableColumns(db, table);
  if (columns.indexOf(oldName) === -1 || columns.indexOf(newName) !== -1) return;
  await db.execute('ALTER TABLE ' + table + ' RENAME COLUMN ' + oldName + ' TO ' + newName);
}

async function dropColumnIfExists(db, table, column) {
  var columns = await getTableColumns(db, table);
  if (columns.indexOf(column) === -1) return;
  await db.execute('ALTER TABLE ' + table + ' DROP COLUMN ' + column);
}

async function runMigrationOnce(db, name, fn) {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  var existing = await db.execute({
    sql: 'SELECT 1 AS ok FROM schema_migrations WHERE name = ? LIMIT 1',
    args: [name]
  });
  if (existing.rows.length) return;
  await fn();
  await db.execute({
    sql: 'INSERT INTO schema_migrations (name) VALUES (?)',
    args: [name]
  });
}

async function migrateOrdersSchema(db) {
  await renameColumnIfExists(db, 'orders', 'out_trade_no', 'merchant_order_no');
  await renameColumnIfExists(db, 'orders', 'trade_no', 'transaction_no');

  await addColumnIfMissing(db, 'orders', 'nickname', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'product_name', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'paid_money', 'REAL');
  await addColumnIfMissing(db, 'orders', 'buyer', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'client_ip', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'user_agent', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'paid_source', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'notify_at', 'TEXT');

  await runMigrationOnce(db, 'timestamps_to_beijing_v1', async function () {
    await db.execute("UPDATE orders SET created_at = datetime(created_at, '+8 hours') WHERE created_at IS NOT NULL AND created_at != ''");
    await db.execute("UPDATE orders SET paid_at = datetime(paid_at, '+8 hours') WHERE paid_at IS NOT NULL AND paid_at != ''");
    await db.execute("UPDATE nominees SET created_at = datetime(created_at, '+8 hours') WHERE created_at IS NOT NULL AND created_at != ''");
    await db.execute("UPDATE barrage_messages SET created_at = datetime(created_at, '+8 hours') WHERE created_at IS NOT NULL AND created_at != ''");
  });

  await runMigrationOnce(db, 'utc_iso_to_beijing_v2', async function () {
    var specs = [
      { table: 'orders', columns: ['created_at', 'paid_at', 'notify_at'] },
      { table: 'nominees', columns: ['created_at'] },
      { table: 'barrage_messages', columns: ['created_at'] },
      { table: 'ticket_verifications', columns: ['scanned_at'] }
    ];
    for (var i = 0; i < specs.length; i++) {
      var spec = specs[i];
      for (var j = 0; j < spec.columns.length; j++) {
        var col = spec.columns[j];
        var expr = "datetime(replace(substr(" + col + ", 1, 19), 'T', ' '), '+8 hours')";
        await db.execute(
          'UPDATE ' + spec.table + ' SET ' + col + ' = ' + expr +
          " WHERE " + col + " LIKE '%Z' OR " + col + " LIKE '%z'"
        );
      }
    }
  });
}

var schemaPromise = null;

// Serverless 下并发请求可能同时进入初始化：用单例 Promise 串行化，避免重复 DDL/迁移
async function ensureSchema() {
  if (ready) return;
  if (!schemaPromise) {
    schemaPromise = doEnsureSchema().catch(function (err) {
      schemaPromise = null; // 失败后允许下次重试
      throw err;
    });
  }
  return schemaPromise;
}

// 全量建库/迁移完成后的版本标记。以后改表结构时把版本号 +1，
// 冷启动会重跑一次全量 DDL（幂等）并写入新标记。
var SCHEMA_SETUP_MARK = 'schema_setup_v4'; // v4: nominees 增加 complex_problem / one_line_intro

async function doEnsureSchema() {
  if (ready) return;
  var db = getClient();

  // 快路径：标记存在说明建库/迁移已全部完成，1 次往返即可放行。
  // 否则冷启动每次都要顺序执行 20+ 条 DDL（每条一个网络往返），跨区库会拖慢首个请求数秒。
  try {
    var mark = await db.execute({
      sql: 'SELECT 1 AS ok FROM schema_migrations WHERE name = ? LIMIT 1',
      args: [SCHEMA_SETUP_MARK]
    });
    if (mark.rows.length) {
      ready = true;
      return;
    }
  } catch (err) {
    // schema_migrations 尚不存在：首次建库，走下方全量流程
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      merchant_order_no TEXT PRIMARY KEY,
      transaction_no TEXT,
      name TEXT NOT NULL,
      nickname TEXT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      wechat TEXT,
      industry TEXT NOT NULL,
      invite TEXT,
      ticket TEXT NOT NULL,
      ticket_name TEXT NOT NULL,
      product_name TEXT,
      price REAL NOT NULL,
      paid_money REAL,
      pay_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      zpay_type TEXT,
      buyer TEXT,
      client_ip TEXT,
      user_agent TEXT,
      paid_source TEXT,
      notify_at TEXT,
      created_at TEXT NOT NULL DEFAULT (${BEIJING_NOW}),
      paid_at TEXT
    )
  `);

  await migrateOrdersSchema(db);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS nominees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nickname TEXT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      wechat TEXT,
      address TEXT NOT NULL,
      photo_mime TEXT,
      photo_base64 TEXT,
      client_ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (${BEIJING_NOW})
    )
  `);

  // 海报人像（AI 生成）存储字段：老库通过 ALTER 补齐
  await addColumnIfMissing(db, 'nominees', 'poster_base64', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'poster_mime', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'poster_at', 'TEXT');

  // 现场领奖确认 / 采访拍摄（前期含城市、典礼期间）/ 授权书勾选：老库通过 ALTER 补齐
  await addColumnIfMissing(db, 'nominees', 'attend_ceremony', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'accept_interview', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'interview_city', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'accept_ceremony_interview', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'auth_agreed', 'INTEGER');

  // 照片缩略图（后台预览用，约几十 KB）：老库通过 ALTER 补齐
  await addColumnIfMissing(db, 'nominees', 'photo_thumb_base64', 'TEXT');

  // 信息收集问答（最自豪的管理决策 / 最复杂的问题 / 一句话介绍自己 / 能力标签）：老库通过 ALTER 补齐
  await addColumnIfMissing(db, 'nominees', 'proud_decision', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'complex_problem', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'one_line_intro', 'TEXT');
  await addColumnIfMissing(db, 'nominees', 'ability_tag', 'TEXT');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS barrage_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      agreed_terms INTEGER NOT NULL DEFAULT 1,
      client_ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (${BEIJING_NOW})
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ticket_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_order_no TEXT NOT NULL,
      client_ip TEXT,
      user_agent TEXT,
      scanned_at TEXT NOT NULL DEFAULT (${BEIJING_NOW})
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_ticket_verifications_order
    ON ticket_verifications (merchant_order_no, scanned_at)
  `);

  // 全量完成，写入版本标记，后续冷启动走快路径
  await db.execute({
    sql: 'INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)',
    args: [SCHEMA_SETUP_MARK]
  });

  ready = true;
}

async function insertOrder(order) {
  await ensureSchema();
  var db = getClient();
  await db.execute({
    sql: `
      INSERT INTO orders (
        merchant_order_no, name, nickname, company, title, phone, email, wechat,
        industry, invite, ticket, ticket_name, product_name, price, pay_method,
        client_ip, user_agent, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `,
    args: [
      order.merchant_order_no,
      order.name,
      order.nickname || '',
      order.company,
      order.title,
      order.phone,
      order.email,
      order.wechat || '',
      order.industry,
      order.invite || '',
      order.ticket,
      order.ticket_name,
      order.product_name || '',
      order.price,
      order.pay_method,
      order.client_ip || '',
      order.user_agent || '',
      nowChinaSql()
    ]
  });
}

async function markOrderPaid(merchantOrderNo, payment, paidSource) {
  await ensureSchema();
  var db = getClient();
  var source = paidSource === 'notify' ? 'notify' : (paidSource === 'free' ? 'free' : 'sync');
  var result = await db.execute({
    sql: `
      UPDATE orders
      SET status = 'paid',
          transaction_no = ?,
          zpay_type = ?,
          paid_money = ?,
          buyer = ?,
          paid_source = ?,
          paid_at = ?,
          notify_at = CASE WHEN ? = 'notify' THEN ? ELSE notify_at END
      WHERE merchant_order_no = ? AND status = 'pending'
    `,
    args: [
      payment.transaction_no || '',
      payment.zpay_type || '',
      payment.paid_money != null ? payment.paid_money : null,
      payment.buyer || '',
      source,
      nowChinaSql(),
      source,
      nowChinaSql(),
      merchantOrderNo
    ]
  });
  return result.rowsAffected > 0;
}

async function recordNotifyReceived(merchantOrderNo) {
  await ensureSchema();
  var db = getClient();
  await db.execute({
    sql: `
      UPDATE orders
      SET notify_at = COALESCE(notify_at, ?)
      WHERE merchant_order_no = ?
    `,
    args: [nowChinaSql(), merchantOrderNo]
  });
}

async function getOrder(merchantOrderNo) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: 'SELECT * FROM orders WHERE merchant_order_no = ? LIMIT 1',
    args: [merchantOrderNo]
  });
  if (!result.rows.length) return null;
  return result.rows[0];
}

async function listOrdersForAdmin() {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute(`
    SELECT
      merchant_order_no, name, company, title,
      ticket, ticket_name, price, paid_money, status,
      created_at, paid_at
    FROM orders
    WHERE status = 'paid'
    ORDER BY datetime(COALESCE(NULLIF(paid_at, ''), created_at)) DESC,
             datetime(created_at) DESC
  `);
  return result.rows;
}

async function listNomineesBrief() {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute(`
    SELECT
      id, name, nickname, company, title, phone, email, wechat, address,
      attend_ceremony, accept_interview, interview_city, accept_ceremony_interview, auth_agreed,
      ability_tag,
      photo_mime,
      CASE WHEN photo_base64 IS NOT NULL AND photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
      CASE WHEN poster_base64 IS NOT NULL AND poster_base64 != '' THEN 1 ELSE 0 END AS has_poster,
      created_at
    FROM nominees
    ORDER BY id DESC
  `);
  return result.rows;
}

// 海报生成专用：只取照片与已存海报，避免一次拉全行
async function getNomineeForPoster(id) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: 'SELECT id, photo_mime, photo_base64, poster_mime, poster_base64 FROM nominees WHERE id = ? LIMIT 1',
    args: [id]
  });
  if (!result.rows.length) return null;
  return result.rows[0];
}

async function saveNomineePoster(id, base64, mime) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: 'UPDATE nominees SET poster_base64 = ?, poster_mime = ?, poster_at = ? WHERE id = ?',
    args: [base64, mime || 'image/png', nowChinaSql(), id]
  });
  return result.rowsAffected > 0;
}

async function getNomineeById(id) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: 'SELECT * FROM nominees WHERE id = ? LIMIT 1',
    args: [id]
  });
  if (!result.rows.length) return null;
  return result.rows[0];
}

// 后台详情默认视图：带缩略图但不拖原图/海报（单行可达数 MB），原图走 getNomineeById
async function getNomineeDetailLite(id) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      SELECT
        id, name, nickname, company, title, phone, email, wechat, address,
        attend_ceremony, accept_interview, interview_city, accept_ceremony_interview, auth_agreed,
        proud_decision, complex_problem, one_line_intro, ability_tag,
        photo_mime, photo_thumb_base64,
        CASE WHEN photo_base64 IS NOT NULL AND photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
        CASE WHEN poster_base64 IS NOT NULL AND poster_base64 != '' THEN 1 ELSE 0 END AS has_poster,
        created_at
      FROM nominees WHERE id = ? LIMIT 1
    `,
    args: [id]
  });
  if (!result.rows.length) return null;
  return result.rows[0];
}

async function insertNominee(data) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      INSERT INTO nominees (
        name, nickname, company, title, phone, email, wechat, address,
        attend_ceremony, accept_interview, interview_city, accept_ceremony_interview,
        proud_decision, complex_problem, one_line_intro, ability_tag, auth_agreed,
        photo_mime, photo_base64, photo_thumb_base64, client_ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      data.name,
      data.nickname || '',
      data.company,
      data.title,
      data.phone,
      data.email,
      data.wechat || '',
      data.address,
      data.attend_ceremony || '',
      data.accept_interview || '',
      data.interview_city || '',
      data.accept_ceremony_interview || '',
      data.proud_decision || '',
      data.complex_problem || '',
      data.one_line_intro || '',
      data.ability_tag || '',
      data.auth_agreed ? 1 : 0,
      data.photo_mime || '',
      data.photo_base64 || '',
      data.photo_thumb_base64 || '',
      data.client_ip || '',
      data.user_agent || ''
    ]
  });
  return Number(result.lastInsertRowid || 0);
}

async function recordTicketVerification(merchantOrderNo, meta) {
  await ensureSchema();
  var db = getClient();
  await db.execute({
    sql: `
      INSERT INTO ticket_verifications (merchant_order_no, client_ip, user_agent, scanned_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [
      merchantOrderNo,
      meta && meta.clientIp ? meta.clientIp : '',
      meta && meta.userAgent ? meta.userAgent : '',
      nowChinaSql()
    ]
  });
}

async function listTicketVerifications(merchantOrderNo) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      SELECT scanned_at
      FROM ticket_verifications
      WHERE merchant_order_no = ?
      ORDER BY scanned_at ASC, id ASC
    `,
    args: [merchantOrderNo]
  });
  return result.rows.map(function (row) {
    return String(row.scanned_at || '');
  });
}

async function insertBarrageMessage(data) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      INSERT INTO barrage_messages (content, agreed_terms, client_ip, user_agent)
      VALUES (?, ?, ?, ?)
    `,
    args: [
      data.content,
      data.agreed_terms ? 1 : 0,
      data.client_ip || '',
      data.user_agent || ''
    ]
  });
  return Number(result.lastInsertRowid || 0);
}

module.exports = {
  ensureSchema,
  insertOrder,
  markOrderPaid,
  recordNotifyReceived,
  getOrder,
  listOrdersForAdmin,
  recordTicketVerification,
  listTicketVerifications,
  listNomineesBrief,
  getNomineeById,
  getNomineeDetailLite,
  getNomineeForPoster,
  saveNomineePoster,
  insertNominee,
  insertBarrageMessage
};
