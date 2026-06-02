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

async function ensureSchema() {
  if (ready) return;
  var db = getClient();

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

async function listNomineesBrief() {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute(`
    SELECT
      id, name, nickname, company, title, phone, email, wechat, address,
      photo_mime,
      CASE WHEN photo_base64 IS NOT NULL AND length(trim(photo_base64)) > 0 THEN 1 ELSE 0 END AS has_photo,
      created_at
    FROM nominees
    ORDER BY id DESC
  `);
  return result.rows;
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

async function insertNominee(data) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      INSERT INTO nominees (
        name, nickname, company, title, phone, email, wechat, address,
        photo_mime, photo_base64, client_ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.photo_mime || '',
      data.photo_base64 || '',
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
  recordTicketVerification,
  listTicketVerifications,
  listNomineesBrief,
  getNomineeById,
  insertNominee,
  insertBarrageMessage
};
