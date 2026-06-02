const { json } = require('../lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var mode = String(req.query.mode || 'status').trim();
  if (mode === 'verify') {
    return require('../lib/handlers/verify')(req, res);
  }
  return require('../lib/handlers/order-status')(req, res);
};
