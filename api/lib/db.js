const { createClient } = require('@libsql/client');
const { env } = require('./zpay');

var client = null;
var ready = false;

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

async function ensureSchema() {
  if (ready) return;
  var db = getClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      out_trade_no TEXT PRIMARY KEY,
      trade_no TEXT,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT
    )
  `);

  await addColumnIfMissing(db, 'orders', 'product_name', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'paid_money', 'REAL');
  await addColumnIfMissing(db, 'orders', 'buyer', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'client_ip', 'TEXT');
  await addColumnIfMissing(db, 'orders', 'user_agent', 'TEXT');

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS barrage_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      agreed_terms INTEGER NOT NULL DEFAULT 1,
      client_ip TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  ready = true;
}

async function insertOrder(order) {
  await ensureSchema();
  var db = getClient();
  await db.execute({
    sql: `
      INSERT INTO orders (
        out_trade_no, name, nickname, company, title, phone, email, wechat,
        industry, invite, ticket, ticket_name, product_name, price, pay_method,
        client_ip, user_agent, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
    args: [
      order.out_trade_no,
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
      order.user_agent || ''
    ]
  });
}

async function markOrderPaid(outTradeNo, payment) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: `
      UPDATE orders
      SET status = 'paid',
          trade_no = ?,
          zpay_type = ?,
          paid_money = ?,
          buyer = ?,
          paid_at = datetime('now')
      WHERE out_trade_no = ? AND status = 'pending'
    `,
    args: [
      payment.trade_no || '',
      payment.zpay_type || '',
      payment.paid_money != null ? payment.paid_money : null,
      payment.buyer || '',
      outTradeNo
    ]
  });
  return result.rowsAffected > 0;
}

async function getOrder(outTradeNo) {
  await ensureSchema();
  var db = getClient();
  var result = await db.execute({
    sql: 'SELECT * FROM orders WHERE out_trade_no = ? LIMIT 1',
    args: [outTradeNo]
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
  getOrder,
  insertNominee,
  insertBarrageMessage
};
