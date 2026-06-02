const { getClientIp } = require('./zpay');

function parseBody(req) {
  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { return null; }
  }
  if (!body || typeof body !== 'object') return null;
  return body;
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function requestMeta(req) {
  return {
    clientIp: getClientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 512)
  };
}

module.exports = {
  parseBody,
  json,
  requestMeta
};
