const { json } = require('./lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  var resource = String(req.query.resource || 'nominees').trim();
  if (resource === 'orders') {
    return require('./lib/handlers/admin-orders')(req, res);
  }
  return require('./lib/handlers/admin-nominees')(req, res);
};
